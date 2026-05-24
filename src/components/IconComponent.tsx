import * as Icons from 'lucide-react';

interface IconComponentProps {
  name: string;
  className?: string;
  size?: number;
}

export function IconComponent({ name, className = '', size = 16 }: IconComponentProps) {
  // Safe dynamic lookup
  const IconNode = (Icons as any)[name];
  if (!IconNode) {
    // Fallback to HelpCircle if icon is not found
    const Fallback = Icons.HelpCircle;
    return <Fallback className={className} size={size} />;
  }
  return <IconNode className={className} size={size} />;
}

// Available icon choices for categories to offer the user
export const AVAILABLE_ICONS = [
  { name: 'ShoppingCart', label: 'Продукты' },
  { name: 'Coffee', label: 'Кафе / Чайхана' },
  { name: 'Home', label: 'Жилье / Аренда' },
  { name: 'Zap', label: 'Коммунальные' },
  { name: 'Bus', label: 'Транспорт' },
  { name: 'Heart', label: 'Здоровье' },
  { name: 'ShoppingBag', label: 'Шопинг' },
  { name: 'Wifi', label: 'Интернет / Связь' },
  { name: 'Car', label: 'Автомобиль' },
  { name: 'Plane', label: 'Путешествия' },
  { name: 'Film', label: 'Развлечения' },
  { name: 'Book', label: 'Образование' },
  { name: 'Gift', label: 'Подарки' },
  { name: 'Briefcase', label: 'Работа' },
  { name: 'Laptop', label: 'Фриланс' },
  { name: 'Percent', label: 'Кэшбэк' },
  { name: 'Coins', label: 'Монеты / Инвестиции' },
  { name: 'Banknote', label: 'Наличные' },
  { name: 'HelpCircle', label: 'Другое' }
];
