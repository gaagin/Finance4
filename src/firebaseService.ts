import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocFromServer, 
  onSnapshot,
  collection,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './googleAuth';
import { FinanceData, Transaction } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 1. Connection check validation
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}

// 2. Fetch all dynamic finance metrics inside user document
export async function getUserFinanceData(uid: string): Promise<FinanceData | null> {
  const path = `users/${uid}`;
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (!docSnap.exists()) {
      return null;
    }
    const docData = docSnap.data();

    // Fetch transactions from subcollection
    const txSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
    const transactions: Transaction[] = [];
    txSnap.forEach(txDoc => {
      transactions.push(txDoc.data() as Transaction);
    });

    return {
      accounts: docData.accounts || [],
      categories: docData.categories || [],
      transactions: transactions,
      budgets: docData.budgets || [],
      cards: docData.cards || [],
    } as FinanceData;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// 2b. Subscribe to user finance data in real-time
export function subscribeToUserFinanceData(
  uid: string,
  onData: (data: FinanceData) => void,
  onError: (error: any) => void
) {
  let isProfileLoaded = false;
  let isTransactionsLoaded = false;
  let currentProfile: any = null;
  let currentTransactions: Transaction[] = [];

  const checkAndEmit = () => {
    if (isProfileLoaded && isTransactionsLoaded) {
      onData({
        accounts: currentProfile?.accounts || [],
        categories: currentProfile?.categories || [],
        transactions: currentTransactions,
        budgets: currentProfile?.budgets || [],
        cards: currentProfile?.cards || [],
      });
    }
  };

  const unsubProfile = onSnapshot(
    doc(db, 'users', uid),
    (docSnap) => {
      if (docSnap.exists()) {
        currentProfile = docSnap.data();
      } else {
        currentProfile = {
          accounts: [],
          categories: [],
          budgets: [],
          cards: [],
        };
      }
      isProfileLoaded = true;
      checkAndEmit();
    },
    (error) => {
      onError(error);
    }
  );

  const unsubTransactions = onSnapshot(
    collection(db, 'users', uid, 'transactions'),
    (querySnap) => {
      const txList: Transaction[] = [];
      querySnap.forEach((txDoc) => {
        txList.push(txDoc.data() as Transaction);
      });
      // Sort transactions by date descending (standard in lists)
      txList.sort((a, b) => b.date.localeCompare(a.date));
      currentTransactions = txList;
      isTransactionsLoaded = true;
      checkAndEmit();
    },
    (error) => {
      onError(error);
    }
  );

  // Return a single cleanup function that unsubscribes both snapshot listeners
  return () => {
    unsubProfile();
    unsubTransactions();
  };
}

// 3. Save full customized state of finances with incremental transaction updates
export async function saveUserFinanceData(
  uid: string, 
  email: string, 
  data: FinanceData,
  previousData?: FinanceData | null
): Promise<void> {
  const path = `users/${uid}`;
  try {
    // 1. Save metadata, accounts, categories, and budgets in the main user document
    const rawPayload = {
      uid,
      email,
      updatedAt: new Date().toISOString(),
      accounts: data.accounts || [],
      categories: data.categories || [],
      budgets: data.budgets || [],
      cards: data.cards || [],
    };
    
    // Clean up undefined values
    const sanitizedPayload = JSON.parse(JSON.stringify(rawPayload, (_, value) => {
      return value === undefined ? null : value;
    }));

    await setDoc(doc(db, 'users', uid), sanitizedPayload);

    // 2. Perform diff on transactions to only update what has changed
    const prevMap = new Map<string, Transaction>();
    if (previousData?.transactions) {
      previousData.transactions.forEach((t) => prevMap.set(t.id, t));
    }

    const addedOrModified: Transaction[] = [];
    const deletedIds: string[] = [];

    // If previousData has no transactions (e.g., seeding, first login), write all
    const hasPreviousTransactions = previousData && previousData.transactions && previousData.transactions.length > 0;
    
    if (!hasPreviousTransactions) {
      // Direct seeding (write all transactions)
      addedOrModified.push(...(data.transactions || []));
    } else {
      // Incremental diff
      const currentTxIds = new Set((data.transactions || []).map(t => t.id));

      // Find deleted transactions
      previousData!.transactions.forEach((prevItem) => {
        if (!currentTxIds.has(prevItem.id)) {
          deletedIds.push(prevItem.id);
        }
      });

      // Find added or modified transactions
      (data.transactions || []).forEach((t) => {
        const prev = prevMap.get(t.id);
        if (!prev) {
          addedOrModified.push(t);
        } else {
          // Compare fields
          const isDifferent = 
            t.accountId !== prev.accountId ||
            t.categoryId !== prev.categoryId ||
            t.amount !== prev.amount ||
            t.type !== prev.type ||
            t.date !== prev.date ||
            t.description !== prev.description ||
            t.cardId !== prev.cardId ||
            t.transferAccountId !== prev.transferAccountId ||
            t.transferType !== prev.transferType;
          if (isDifferent) {
            addedOrModified.push(t);
          }
        }
      });
    }

    const batchLimit = 500;

    // A. Write added/modified transactions in chunks of 500
    for (let i = 0; i < addedOrModified.length; i += batchLimit) {
      const chunk = addedOrModified.slice(i, i + batchLimit);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docRef = doc(db, 'users', uid, 'transactions', item.id);
        const sanitizedItem = JSON.parse(JSON.stringify(item, (_, v) => v === undefined ? null : v));
        batch.set(docRef, sanitizedItem);
      });
      await batch.commit();
    }

    // B. Delete removed transactions in chunks of 500
    for (let i = 0; i < deletedIds.length; i += batchLimit) {
      const chunk = deletedIds.slice(i, i + batchLimit);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const docRef = doc(db, 'users', uid, 'transactions', id);
        batch.delete(docRef);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Force wipe and seed the database with clean FinanceData (no residual old docs)
export async function reinitUserFinanceData(
  uid: string,
  email: string,
  data: FinanceData
): Promise<void> {
  const path = `users/${uid}`;
  try {
    // 1. Fetch all current transaction document IDs
    const txSnap = await getDocs(collection(db, 'users', uid, 'transactions'));
    const oldIds: string[] = [];
    txSnap.forEach(docSnap => {
      oldIds.push(docSnap.id);
    });

    const batchLimit = 500;

    // 2. Delete all existing transactions in chunks of 500
    for (let i = 0; i < oldIds.length; i += batchLimit) {
      const chunk = oldIds.slice(i, i + batchLimit);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        batch.delete(doc(db, 'users', uid, 'transactions', id));
      });
      await batch.commit();
    }

    // 3. Save main document metadata (accounts, categories, budgets, cards)
    const rawPayload = {
      uid,
      email,
      updatedAt: new Date().toISOString(),
      accounts: data.accounts || [],
      categories: data.categories || [],
      budgets: data.budgets || [],
      cards: data.cards || [],
    };
    
    const sanitizedPayload = JSON.parse(JSON.stringify(rawPayload, (_, value) => {
      return value === undefined ? null : value;
    }));

    await setDoc(doc(db, 'users', uid), sanitizedPayload);

    // 4. Write all new transactions in chunks of 500
    const addedTransactions = data.transactions || [];
    for (let i = 0; i < addedTransactions.length; i += batchLimit) {
      const chunk = addedTransactions.slice(i, i + batchLimit);
      const batch = writeBatch(db);
      chunk.forEach((item) => {
        const docRef = doc(db, 'users', uid, 'transactions', item.id);
        const sanitizedItem = JSON.parse(JSON.stringify(item, (_, v) => v === undefined ? null : v));
        batch.set(docRef, sanitizedItem);
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

