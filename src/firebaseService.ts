import { doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from './googleAuth';
import { FinanceData } from './types';

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
    if (docSnap.exists()) {
      const docData = docSnap.data();
      return {
        accounts: docData.accounts || [],
        categories: docData.categories || [],
        transactions: docData.transactions || [],
        budgets: docData.budgets || [],
        cards: docData.cards || [],
      } as FinanceData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// 3. Save full customized state of finances
export async function saveUserFinanceData(uid: string, email: string, data: FinanceData): Promise<void> {
  const path = `users/${uid}`;
  try {
    const rawPayload = {
      uid,
      email,
      updatedAt: new Date().toISOString(),
      accounts: data.accounts || [],
      categories: data.categories || [],
      transactions: data.transactions || [],
      budgets: data.budgets || [],
      cards: data.cards || [],
    };
    
    // Clean up all undefined values recursively since Firestore does not support 'undefined'
    const sanitizedPayload = JSON.parse(JSON.stringify(rawPayload, (_, value) => {
      // In JS, undefined values in objects are omitted by JSON.stringify anyway,
      // but in arrays it converts them to null, which is valid for Firestore.
      return value === undefined ? null : value;
    }));

    await setDoc(doc(db, 'users', uid), sanitizedPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
