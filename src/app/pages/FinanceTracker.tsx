import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { formatNumberToIDR, toIDRCurrency } from '../utils/formatters';
import { AmountInput } from '../components/AmountInput';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Plus, Pencil, Trash2, Download, TrendingUp, TrendingDown, Wallet, PieChart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export function FinanceTracker() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [newCategory, setNewCategory] = useState('');
  
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    category: '',
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [loadedTransactions, loadedCategories] = await Promise.all([
        dataService.getTransactions(),
        dataService.getCategories(),
      ]);
      setTransactions(loadedTransactions);
      setCategories(loadedCategories);
    } catch (error) {
      toast.error('Failed to load data from Supabase');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleAddTransaction = async () => {
    if (!user || !formData.description || !formData.amount || !formData.category) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await dataService.addTransaction({
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        category: formData.category,
        user_id: user.id,
      });
      loadData();
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Transaction added successfully');
    } catch (error) {
      toast.error('Failed to add transaction');
    }
  };

  const handleUpdateTransaction = async () => {
    if (!user || !editingTransaction || !formData.description || !formData.amount || !formData.category) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await dataService.updateTransaction(editingTransaction.id, {
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        category: formData.category,
      });
      loadData();
      setIsEditDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      toast.success('Transaction updated successfully');
    } catch (error) {
      toast.error('Failed to update transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user) return;
    
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await dataService.deleteTransaction(transactionId);
        loadData();
        toast.success('Transaction deleted successfully');
      } catch (error) {
        toast.error('Failed to delete transaction');
      }
    }
  };

  const handleEditClick = (transaction: any) => {
    setEditingTransaction(transaction);
    setFormData({
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date,
      category: transaction.category,
    });
    setIsEditDialogOpen(true);
  };

  const handleAddCategory = async () => {
    if (!user || !newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      await dataService.addCategory({
        name: newCategory,
        user_id: user.id,
      });
      loadData();
      setNewCategory('');
      toast.success('Category added successfully');
    } catch (error) {
      toast.error('Failed to add category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    
    const categoryName = categories.find(c => c.id === categoryId)?.name;
    const hasTransactions = transactions.some(t => t.category === categoryName);
    
    if (hasTransactions) {
      toast.error('Cannot delete category with existing transactions');
      return;
    }

    try {
      await dataService.deleteCategory(categoryId);
      loadData();
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: '',
    });
  };

  // Analytics
  const getCurrentMonthTotal = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getPreviousMonthTotal = () => {
    const now = new Date();
    const previousMonth = now.getMonth() - 1;
    const year = previousMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = previousMonth < 0 ? 11 : previousMonth;
    
    return transactions
      .filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === month && tDate.getFullYear() === year;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpenses = () => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  };

  const getCategoryData = () => {
    const categoryTotals: { [key: string]: number } = {};
    
    transactions.forEach(t => {
      if (categoryTotals[t.category]) {
        categoryTotals[t.category] += t.amount;
      } else {
        categoryTotals[t.category] = t.amount;
      }
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  };

  const getMonthlyData = () => {
    const monthlyTotals: { [key: string]: number } = {};
    
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (monthlyTotals[monthYear]) {
        monthlyTotals[monthYear] += t.amount;
      } else {
        monthlyTotals[monthYear] = t.amount;
      }
    });

    return Object.entries(monthlyTotals)
      .map(([month, amount]) => ({
        month,
        amount: Math.round(amount),
      }))
      .sort((a, b) => {
        const [aMonth, aYear] = a.month.split('/').map(Number);
        const [bMonth, bYear] = b.month.split('/').map(Number);
        return aYear - bYear || aMonth - bMonth;
      })
      .slice(-6); // Last 6 months
  };

  // Export Functions
  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    doc.setFontSize(20);
    doc.text('Laporan Keuangan', 20, 20);
    doc.setFontSize(12);
    doc.text(currentMonth, 20, 30);
    doc.text(`User: ${user?.username}`, 20, 38);
    
    doc.setFontSize(14);
    doc.text('Ringkasan', 20, 50);
    doc.setFontSize(10);
    doc.text(`Total Pengeluaran: ${toIDRCurrency(getTotalExpenses())}`, 20, 58);
    doc.text(`Bulan Ini: ${toIDRCurrency(getCurrentMonthTotal())}`, 20, 66);
    doc.text(`Bulan Sebelumnya: ${toIDRCurrency(getPreviousMonthTotal())}`, 20, 74);
    
    doc.setFontSize(14);
    doc.text('Transaksi Terakhir', 20, 90);
    doc.setFontSize(9);
    
    let yPos = 98;
    transactions.slice(0, 15).forEach((t) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${t.date} - ${t.description} - ${toIDRCurrency(t.amount)} - ${t.category}`, 20, yPos);
      yPos += 6;
    });
    
    doc.save(`laporan-keuangan-${Date.now()}.pdf`);
    toast.success('PDF exported successfully');
  };

  const exportToExcel = () => {
    const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    const data = transactions.map(t => ({
      Tanggal: t.date,
      Deskripsi: t.description,
      Jumlah: t.amount,
      Kategori: t.category,
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    XLSX.utils.sheet_add_aoa(ws, [
      ['Laporan Keuangan'],
      [currentMonth],
      [`User: ${user?.username}`],
      [],
      ['Ringkasan'],
      [`Total Pengeluaran: ${toIDRCurrency(getTotalExpenses())}`],
      [`Bulan Ini: ${toIDRCurrency(getCurrentMonthTotal())}`],
      [`Bulan Sebelumnya: ${toIDRCurrency(getPreviousMonthTotal())}`],
      [],
      ['Transaksi'],
    ], { origin: 'A1' });
    
    XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
    XLSX.writeFile(wb, `laporan-keuangan-${Date.now()}.xlsx`);
    toast.success('Excel exported successfully');
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentMonthTotal = getCurrentMonthTotal();
  const previousMonthTotal = getPreviousMonthTotal();
  const monthDifference = currentMonthTotal - previousMonthTotal;
  const monthPercentage = previousMonthTotal > 0 
    ? ((monthDifference / previousMonthTotal) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Finance Tracker</h1>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Total Pengeluaran</CardDescription>
                <Wallet className="w-4 h-4 text-gray-500" />
              </div>
              <CardTitle className="text-2xl">{toIDRCurrency(getTotalExpenses())}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Bulan Ini</CardDescription>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <CardTitle className="text-2xl">{toIDRCurrency(currentMonthTotal)}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Bulan Sebelumnya</CardDescription>
                <TrendingDown className="w-4 h-4 text-gray-500" />
              </div>
              <CardTitle className="text-2xl">{toIDRCurrency(previousMonthTotal)}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Perbandingan Bulan</CardDescription>
                {monthDifference >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-green-500" />
                )}
              </div>
              <CardTitle className={`text-2xl ${monthDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {monthDifference >= 0 ? '+' : ''}{monthPercentage}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Tren Pengeluaran Bulanan</CardTitle>
              <CardDescription>6 bulan terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                {getMonthlyData().length > 0 ? (
                  <LineChart data={getMonthlyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `Rp ${formatNumberToIDR(value)}`} />
                    <Tooltip formatter={(value: number) => [toIDRCurrency(value), 'Jumlah']} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" name="Jumlah" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">Belum ada data</div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Pengeluaran per Kategori</CardTitle>
              <CardDescription>Distribusi pengeluaran</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                {getCategoryData().length > 0 ? (
                  <RePieChart>
                    <Pie
                      data={getCategoryData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${toIDRCurrency(entry.value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getCategoryData().map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => toIDRCurrency(value)} />
                  </RePieChart>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">Belum ada data</div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transaksi</CardTitle>
                  <CardDescription>Kelola pemasukan dan pengeluaran kamu</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetForm()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Transaksi
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tambah Transaksi</DialogTitle>
                      <DialogDescription>Masukkan detail transaksi baru kamu</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="description">Deskripsi</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Contoh: Belanja Bulanan"
                        />
                      </div>
                      
                      <AmountInput
                        id="amount"
                        label="Jumlah"
                        value={formData.amount}
                        onChange={(value) => setFormData({ ...formData, amount: value })}
                      />

                      <div>
                        <Label htmlFor="date">Tanggal</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Kategori</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddTransaction} className="w-full">
                        Simpan Transaksi
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && transactions.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada transaksi. Tambah transaksi pertama kamu!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{transaction.date}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              {transaction.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">{toIDRCurrency(transaction.amount)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(transaction)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kategori</CardTitle>
              <CardDescription>Kelola kategori pengeluaran kamu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nama kategori baru"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <Button onClick={handleAddCategory} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                    >
                      <span>{category.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Transaksi</DialogTitle>
            <DialogDescription>Perbarui detail transaksi kamu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="edit-description">Deskripsi</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            
            <AmountInput
              id="edit-amount"
              label="Jumlah"
              value={formData.amount}
              onChange={(value) => setFormData({ ...formData, amount: value })}
            />

            <div>
              <Label htmlFor="edit-date">Tanggal</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-category">Kategori</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateTransaction} className="w-full">
              Simpan Perubahan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


