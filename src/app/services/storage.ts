// Storage service for managing localStorage with user-specific data

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  userId: string;
}

export interface Category {
  id: string;
  name: string;
  userId: string;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[]; // Array of user IDs
}

export interface Bill {
  id: string;
  title: string;
  items: BillItem[];
  participants: string[]; // Array of participant names
  discount: number;
  discountType: 'percentage' | 'fixed';
  userId: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
}

class StorageService {
  // User Management
  getUsers(): User[] {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  }

  saveUser(user: User): void {
    const users = this.getUsers();
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
  }

  getUserByUsername(username: string): User | undefined {
    const users = this.getUsers();
    return users.find(u => u.username === username);
  }

  // Current User
  getCurrentUser(): User | null {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  setCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearCurrentUser(): void {
    localStorage.removeItem('currentUser');
  }

  // Transactions
  getTransactions(userId: string): Transaction[] {
    const transactions = localStorage.getItem(`transactions_${userId}`);
    return transactions ? JSON.parse(transactions) : [];
  }

  saveTransactions(userId: string, transactions: Transaction[]): void {
    localStorage.setItem(`transactions_${userId}`, JSON.stringify(transactions));
  }

  addTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions(transaction.userId);
    transactions.push(transaction);
    this.saveTransactions(transaction.userId, transactions);
  }

  updateTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions(transaction.userId);
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index !== -1) {
      transactions[index] = transaction;
      this.saveTransactions(transaction.userId, transactions);
    }
  }

  deleteTransaction(userId: string, transactionId: string): void {
    const transactions = this.getTransactions(userId);
    const filtered = transactions.filter(t => t.id !== transactionId);
    this.saveTransactions(userId, filtered);
  }

  // Categories
  getCategories(userId: string): Category[] {
    const categories = localStorage.getItem(`categories_${userId}`);
    if (categories) {
      return JSON.parse(categories);
    }
    
    // Default categories
    const defaultCategories: Category[] = [
      { id: '1', name: 'Food', userId },
      { id: '2', name: 'Transport', userId },
      { id: '3', name: 'Shopping', userId },
      { id: '4', name: 'Entertainment', userId },
      { id: '5', name: 'Utilities', userId },
      { id: '6', name: 'Healthcare', userId },
      { id: '7', name: 'Other', userId },
    ];
    
    this.saveCategories(userId, defaultCategories);
    return defaultCategories;
  }

  saveCategories(userId: string, categories: Category[]): void {
    localStorage.setItem(`categories_${userId}`, JSON.stringify(categories));
  }

  addCategory(category: Category): void {
    const categories = this.getCategories(category.userId);
    categories.push(category);
    this.saveCategories(category.userId, categories);
  }

  deleteCategory(userId: string, categoryId: string): void {
    const categories = this.getCategories(userId);
    const filtered = categories.filter(c => c.id !== categoryId);
    this.saveCategories(userId, filtered);
  }

  // Bills
  getBills(userId: string): Bill[] {
    const bills = localStorage.getItem(`bills_${userId}`);
    return bills ? JSON.parse(bills) : [];
  }

  saveBills(userId: string, bills: Bill[]): void {
    localStorage.setItem(`bills_${userId}`, JSON.stringify(bills));
  }

  addBill(bill: Bill): void {
    const bills = this.getBills(bill.userId);
    bills.push(bill);
    this.saveBills(bill.userId, bills);
  }

  deleteBill(userId: string, billId: string): void {
    const bills = this.getBills(userId);
    const filtered = bills.filter(b => b.id !== billId);
    this.saveBills(userId, filtered);
  }
}

export const storageService = new StorageService();
