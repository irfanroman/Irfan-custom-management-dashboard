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
import { ThemeToggle } from '../components/ThemeToggle';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
      <header className="bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 sticky top-0 z-10 shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="dark:text-white dark:hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <h1 className="text-xl font-bold dark:text-white tracking-tight">Finance Tracker</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 h-9 font-bold">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 h-9 font-bold">
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm border-blue-100/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="dark:text-slate-400 font-medium">Total Pengeluaran</CardDescription>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black dark:text-white tracking-tighter">{toIDRCurrency(getTotalExpenses())}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm border-purple-100/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="dark:text-slate-400 font-medium">Bulan Ini</CardDescription>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black dark:text-white tracking-tighter">{toIDRCurrency(currentMonthTotal)}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm border-emerald-100/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="dark:text-slate-400 font-medium">Bulan Sebelumnya</CardDescription>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black dark:text-white tracking-tighter">{toIDRCurrency(previousMonthTotal)}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className={`dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm ${monthDifference >= 0 ? 'border-rose-100/50' : 'border-emerald-100/50'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="dark:text-slate-400 font-medium">Pertumbuhan</CardDescription>
                <div className={`p-2 rounded-lg ${monthDifference >= 0 ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
                  {monthDifference >= 0 ? (
                    <TrendingUp className={`w-4 h-4 ${monthDifference >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
              </div>
              <CardTitle className={`text-2xl font-black tracking-tighter ${monthDifference >= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {monthDifference >= 0 ? '+' : ''}{monthPercentage}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="dark:text-white font-bold tracking-tight">Tren Pengeluaran Bulanan</CardTitle>
              <CardDescription className="dark:text-slate-400">6 bulan terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                {getMonthlyData().length > 0 ? (
                  <LineChart data={getMonthlyData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.2} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#64748b" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `Rp ${formatNumberToIDR(value)}`} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#1e293b', 
                        borderRadius: '12px',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ color: '#3b82f6' }}
                      formatter={(value: number) => [toIDRCurrency(value), 'Jumlah']} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      name="Jumlah" 
                      stroke="#3b82f6" 
                      strokeWidth={4} 
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 grayscale opacity-40">
                    <TrendingUp className="w-12 h-12" />
                    <p className="font-bold text-sm">BELUM ADA DATA TRANSAKSI</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="dark:text-white font-bold tracking-tight">Pengeluaran per Kategori</CardTitle>
              <CardDescription className="dark:text-slate-400">Distribusi pengeluaran</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                {getCategoryData().length > 0 ? (
                  <RePieChart>
                    <Pie
                      data={getCategoryData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getCategoryData().map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#1e293b', 
                        borderRadius: '12px',
                        color: '#f8fafc'
                      }}
                      formatter={(value: number) => toIDRCurrency(value)} 
                    />
                  </RePieChart>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 grayscale opacity-40">
                    <PieChart className="w-12 h-12" />
                    <p className="font-bold text-sm">BELUM ADA DATA KATEGORI</p>
                  </div>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="dark:text-white font-bold">Transaksi</CardTitle>
                  <CardDescription className="dark:text-slate-400">Kelola operasional harian kamu</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetForm()} className="bg-black dark:bg-white text-white dark:text-black font-bold h-10 px-6 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform">
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Transaksi
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black dark:text-white tracking-tight">Tambah Transaksi</DialogTitle>
                      <DialogDescription className="dark:text-slate-400 font-medium">Masukkan detail transaksi baru kamu</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="description" className="dark:text-slate-300 font-bold">Deskripsi</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Contoh: Belanja Bulanan"
                          className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                      </div>
                      
                      <AmountInput
                        id="amount"
                        label="Jumlah"
                        value={formData.amount}
                        onChange={(value) => setFormData({ ...formData, amount: value })}
                        className="dark:text-white"
                      />

                      <div className="space-y-2">
                        <Label htmlFor="date" className="dark:text-slate-300 font-bold">Tanggal</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category" className="dark:text-slate-300 font-bold">Kategori</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                          <SelectTrigger className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name} className="dark:text-slate-200 dark:focus:bg-slate-700">
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddTransaction} className="w-full h-12 bg-black dark:bg-white text-white dark:text-black font-black text-base shadow-xl mt-4">
                        Simpan Transaksi
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && transactions.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-16 text-slate-500 grayscale opacity-40 flex flex-col items-center gap-4">
                  <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <PieChart className="w-12 h-12" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-sm tracking-widest">BELUM ADA TRANSAKSI</p>
                    <p className="text-xs font-medium">Catat pengeluaranmu untuk mulai memantau</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest dark:text-slate-500">Tanggal</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest dark:text-slate-500">Deskripsi</TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-widest dark:text-slate-500">Kategori</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest dark:text-slate-500">Jumlah</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest dark:text-slate-500">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id} className="dark:border-slate-800 dark:hover:bg-slate-800/30 group">
                          <TableCell className="dark:text-slate-300 font-medium tabular-nums text-xs">
                            {new Date(transaction.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </TableCell>
                          <TableCell className="dark:text-slate-100 font-bold">{transaction.description}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 uppercase tracking-tighter">
                              {transaction.category}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-black dark:text-white tabular-nums tracking-tighter">
                            {toIDRCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(transaction)}
                                className="h-8 w-8 p-0 dark:text-slate-400 dark:hover:text-white"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="h-8 w-8 p-0 dark:text-slate-400 dark:hover:text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="dark:text-white font-bold">Kategori</CardTitle>
              <CardDescription className="dark:text-slate-400">Kelola master data pengeluaran</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nama kategori baru"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                    className="h-10 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                  <Button onClick={handleAddCategory} size="sm" className="bg-black dark:bg-white text-white dark:text-black font-bold h-10 px-4">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-1">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <span className="font-bold text-sm dark:text-slate-200 group-hover:text-primary transition-colors">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </Button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-center py-8 text-xs font-bold text-slate-500 uppercase tracking-widest opacity-40">BELUM ADA KATEGORI</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black dark:text-white tracking-tight">Ubah Transaksi</DialogTitle>
            <DialogDescription className="dark:text-slate-400 font-medium">Perbarui detail transaksi kamu</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="dark:text-slate-300 font-bold">Deskripsi</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            
            <AmountInput
              id="edit-amount"
              label="Jumlah"
              value={formData.amount}
              onChange={(value) => setFormData({ ...formData, amount: value })}
              className="dark:text-white"
            />

            <div className="space-y-2">
              <Label htmlFor="edit-date" className="dark:text-slate-300 font-bold">Tanggal</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category" className="dark:text-slate-300 font-bold">Kategori</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} className="dark:text-slate-200 dark:focus:bg-slate-700">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleUpdateTransaction} className="w-full h-12 bg-black dark:bg-white text-white dark:text-black font-black text-base shadow-xl mt-4">
              Simpan Perubahan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


