import { supabase } from './supabase';
import { Database } from './database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type Category = Database['public']['Tables']['categories']['Row'];
type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
type Bill = Database['public']['Tables']['bills']['Row'];
type BillInsert = Database['public']['Tables']['bills']['Insert'];
type BillItem = Database['public']['Tables']['bill_items']['Row'];
type BillItemInsert = Database['public']['Tables']['bill_items']['Insert'];

class DataService {
  // Transactions
  async getTransactions() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async addTransaction(transaction: TransactionInsert) {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateTransaction(id: string, transaction: Partial<TransactionInsert>) {
    const { data, error } = await supabase
      .from('transactions')
      .update(transaction)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTransaction(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    // If no categories, return defaults (handled by the caller or we can insert them here)
    return data || [];
  }

  async addCategory(category: CategoryInsert) {
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Bills
  async getBills() {
    const { data, error } = await supabase
      .from('bills')
      .select('*, bill_items(*)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async addBill(bill: BillInsert, items: Omit<BillItemInsert, 'bill_id'>[]) {
    // Start a transaction-like process (Supabase doesn't have multi-table transactions in JS SDK easily without RPC, 
    // but we can do them sequentially or use a stored procedure if needed)
    const { data: billData, error: billError } = await supabase
      .from('bills')
      .insert(bill)
      .select()
      .single();
    
    if (billError) throw billError;

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        bill_id: billData.id
      }));
      
      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
    }

    return billData;
  }

  async deleteBill(id: string) {
    const { error } = await supabase
      .from('bills')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}

export const dataService = new DataService();
