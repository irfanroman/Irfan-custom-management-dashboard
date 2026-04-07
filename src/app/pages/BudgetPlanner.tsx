import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { toIDRCurrency } from '../utils/formatters';
import { AmountInput } from '../components/AmountInput';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ArrowLeft, Plus, Pencil, Trash2, Target, TrendingUp, Loader2, Clock, ListChecks, History } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';

export function BudgetPlanner() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [selectedGoalLogs, setSelectedGoalLogs] = useState<any[]>([]);
  
  const [goalFormData, setGoalFormData] = useState({
    name: '',
    target_amount: 0,
  });
  
  const [progressAmount, setProgressAmount] = useState(0);
  const [progressSource, setProgressSource] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const loadedGoals = await dataService.getBudgetGoals();
      setGoals(loadedGoals);
    } catch (error) {
      toast.error('Gagal memuat data budget');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddGoal = async () => {
    if (!user || !goalFormData.name || !goalFormData.target_amount) {
      toast.error('Mohon isi semua field');
      return;
    }

    try {
      await dataService.addBudgetGoal({
        name: goalFormData.name,
        target_amount: goalFormData.target_amount,
        user_id: user.id,
        current_amount: 0,
      });
      loadData();
      setIsAddingGoal(false);
      setGoalFormData({ name: '', target_amount: 0 });
      toast.success('Target budget berhasil ditambahkan');
    } catch (error) {
      toast.error('Gagal menambah target');
    }
  };

  const handleEditGoal = async () => {
    if (!selectedGoal || !goalFormData.name || !goalFormData.target_amount) return;

    try {
      await dataService.updateBudgetGoal(selectedGoal.id, {
        name: goalFormData.name,
        target_amount: goalFormData.target_amount,
      });
      loadData();
      setIsEditingGoal(false);
      setSelectedGoal(null);
      toast.success('Target berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui target');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm('Hapus target ini?')) return;
    try {
      await dataService.deleteBudgetGoal(id);
      loadData();
      toast.success('Target dihapus');
    } catch (error) {
      toast.error('Gagal menghapus target');
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedGoal || progressAmount <= 0) {
      toast.error('Jumlah tabungan harus lebih dari 0');
      return;
    }
    
    try {
      // 1. Tambah Log
      await dataService.addBudgetGoalLog({
        goal_id: selectedGoal.id,
        amount: progressAmount,
        source: progressSource || 'Tidak ada sumber',
      });

      // 2. Update Goal Current Amount
      await dataService.updateBudgetGoal(selectedGoal.id, {
        current_amount: selectedGoal.current_amount + progressAmount,
      });

      loadData();
      setIsUpdatingProgress(false);
      setSelectedGoal(null);
      setProgressAmount(0);
      setProgressSource('');
      toast.success('Progres berhasil diperbarui');
    } catch (error) {
      toast.error('Gagal memperbarui progres');
      console.error(error);
    }
  };

  const handleViewHistory = async (goal: any) => {
    setSelectedGoal(goal);
    try {
      const logs = await dataService.getBudgetGoalLogs(goal.id);
      setSelectedGoalLogs(logs);
      setIsHistoryOpen(true);
    } catch (error) {
      toast.error('Gagal memuat riwayat');
    }
  };

  if (isLoading && goals.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalSaved = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
      <header className="bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 sticky top-0 z-10 shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="dark:text-white dark:hover:bg-slate-800 px-2 sm:px-3">
                <ArrowLeft className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Kembali</span>
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold dark:text-white truncate">Budget Planner</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
          <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10 backdrop-blur-sm">
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Total Semua Tabungan</CardDescription>
                <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black text-emerald-900 dark:text-emerald-300 tracking-tighter truncate">{toIDRCurrency(totalSaved)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 backdrop-blur-sm">
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-blue-700 dark:text-blue-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Total Target Terdaftar</CardDescription>
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-300 tracking-tighter truncate">{toIDRCurrency(totalTarget)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Goals Section */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white flex items-center justify-center sm:justify-start gap-3 tracking-tight">
            <div className="p-1.5 sm:p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" />
            </div>
            Target Tabungan
          </h2>
          <Button onClick={() => setIsAddingGoal(true)} className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black font-bold h-11 px-6 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-transform">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Target
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800 backdrop-blur-sm">
            <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Target className="w-10 h-10 text-gray-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Belum ada target</h3>
            <p className="text-gray-500 dark:text-slate-400 font-medium">Mulai buat rencana tabungan untuk impian kamu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {goals.map((goal) => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              return (
                <Card key={goal.id} className="overflow-hidden group border-white/50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg transition-all hover:shadow-2xl sm:hover:-translate-y-1">
                  <CardHeader className="pb-3 pt-5 px-5 sm:pb-4 sm:pt-6 sm:px-6">
                    <div className="flex items-start justify-between mb-1 sm:mb-2 gap-2">
                       <div className="space-y-1 min-w-0">
                        <CardTitle className="text-lg sm:text-xl font-black dark:text-white group-hover:text-primary transition-colors truncate">{goal.name}</CardTitle>
                        <CardDescription className="font-bold text-[10px] sm:text-xs dark:text-slate-500 uppercase tracking-widest truncate">
                          TARGET: {toIDRCurrency(goal.target_amount)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedGoal(goal);
                          setGoalFormData({ name: goal.name, target_amount: goal.target_amount });
                          setIsEditingGoal(true);
                        }} className="h-8 w-8 p-0 dark:text-slate-400 dark:hover:text-white bg-slate-100 sm:bg-transparent dark:bg-slate-800/50 sm:dark:bg-transparent rounded-full">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)} className="h-8 w-8 p-0 dark:text-slate-400 dark:hover:text-rose-500 bg-rose-50 sm:bg-transparent dark:bg-rose-900/20 sm:dark:bg-transparent rounded-full text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-5 sm:px-6">
                    <div className="flex justify-between items-end mb-2 sm:mb-3">
                       <div className="space-y-0.5 min-w-0 pr-2">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Terkumpul</p>
                        <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tighter truncate">{toIDRCurrency(goal.current_amount)}</p>
                      </div>
                      <div className="text-right space-y-0.5 flex-shrink-0">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Progress</p>
                        <p className="text-lg sm:text-xl font-bold dark:text-white tabular-nums tracking-tight">{progress.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={progress} className="h-2.5 sm:h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full" />
                      <div className="absolute inset-0 bg-blue-400/10 animate-pulse rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    
                    <div className="mt-3 sm:mt-4 flex justify-start">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest h-8 px-2 sm:px-3 -ml-2 sm:-ml-3 text-slate-500 hover:text-black dark:text-slate-500 dark:hover:text-slate-300 flex items-center gap-1.5 transition-colors"
                        onClick={() => handleViewHistory(goal)}
                      >
                        <History className="w-3 h-3" />
                        Riwayat Tabungan
                      </Button>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 dark:bg-slate-800/30 p-3 sm:p-4 mt-3 sm:mt-4 border-t dark:border-slate-800/50">
                    <Button 
                      variant="outline" 
                      className="w-full h-10 sm:h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm tracking-tight hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all active:scale-[0.98]"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setIsUpdatingProgress(true);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                      Tambah Saldo
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Goal Dialog */}
      <Dialog open={isAddingGoal} onOpenChange={setIsAddingGoal}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black dark:text-white tracking-tight">Tambah Target Baru</DialogTitle>
            <DialogDescription className="dark:text-slate-400 font-medium">Tentukan apa yang ingin kamu capai.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name" className="dark:text-slate-300 font-bold">Nama Target</Label>
              <Input
                id="goal-name"
                placeholder="Contoh: Beli Laptop Baru"
                value={goalFormData.name}
                onChange={(e) => setGoalFormData({ ...goalFormData, name: e.target.value })}
                className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <AmountInput
              id="goal-amount"
              label="Harga Tujuan"
              value={goalFormData.target_amount}
              onChange={(val) => setGoalFormData({ ...goalFormData, target_amount: val })}
              className="dark:text-white"
            />
          </div>
          <DialogFooter className="pt-8 flex gap-2">
            <Button variant="outline" onClick={() => setIsAddingGoal(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 flex-1 font-bold">Batal</Button>
            <Button onClick={handleAddGoal} className="bg-black dark:bg-white text-white dark:text-black font-black flex-1 shadow-xl">Simpan Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black dark:text-white tracking-tight">Ubah Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goal-name" className="dark:text-slate-300 font-bold">Nama Target</Label>
              <Input
                id="edit-goal-name"
                value={goalFormData.name}
                onChange={(e) => setGoalFormData({ ...goalFormData, name: e.target.value })}
                className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
            <AmountInput
              id="edit-goal-amount"
              label="Harga Tujuan"
              value={goalFormData.target_amount}
              onChange={(val) => setGoalFormData({ ...goalFormData, target_amount: val })}
              className="dark:text-white"
            />
          </div>
          <DialogFooter className="pt-8 flex gap-2">
            <Button variant="outline" onClick={() => setIsEditingGoal(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 flex-1 font-bold">Batal</Button>
            <Button onClick={handleEditGoal} className="bg-black dark:bg-white text-white dark:text-black font-black flex-1 shadow-xl">Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Progress Dialog */}
      <Dialog open={isUpdatingProgress} onOpenChange={setIsUpdatingProgress}>
        <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black dark:text-white tracking-tight">Tambah Tabungan</DialogTitle>
            <DialogDescription className="dark:text-slate-400 font-medium">
              Tambah saldo untuk target: <span className="text-black dark:text-white font-bold">{selectedGoal?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <AmountInput
              id="progress-amount"
              label="Jumlah Tabungan"
              value={progressAmount}
              onChange={(val) => setProgressAmount(val)}
              className="dark:text-white"
            />
            <div className="space-y-2">
              <Label htmlFor="progress-source" className="dark:text-slate-300 font-bold">Sumber Dana (Opsional)</Label>
              <Input
                id="progress-source"
                placeholder="Contoh: Gaji bulan April / Bonus"
                value={progressSource}
                onChange={(e) => setProgressSource(e.target.value)}
                className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter className="pt-8 flex gap-2">
            <Button variant="outline" onClick={() => setIsUpdatingProgress(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 flex-1 font-bold">Batal</Button>
            <Button onClick={handleUpdateProgress} className="bg-black dark:bg-white text-white dark:text-black font-black flex-1 shadow-xl">Tambah Sekarang</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl font-black dark:text-white tracking-tight">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <History className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              Riwayat: {selectedGoal?.name}
            </DialogTitle>
            <DialogDescription className="dark:text-slate-400 font-medium">
              Detail penambahan dana untuk target impianmu.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 sm:py-6 overflow-hidden flex flex-col max-h-[60vh] sm:max-h-none">
            <div className="overflow-auto rounded-xl sm:rounded-2xl border dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 sm:max-h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:text-slate-500 w-24 sm:w-auto">Tanggal</TableHead>
                    <TableHead className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:text-slate-500">Sumber Dana</TableHead>
                    <TableHead className="text-right text-[9px] sm:text-[10px] font-black uppercase tracking-widest dark:text-slate-500">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGoalLogs.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={3} className="text-center py-10 sm:py-20 text-slate-500 grayscale opacity-40">
                        <div className="flex flex-col items-center gap-2 sm:gap-3">
                          <Clock className="w-8 h-8 sm:w-10 sm:h-10 mb-1 sm:mb-2" />
                          <p className="font-black text-[10px] sm:text-xs uppercase tracking-widest">BELUM ADA RIWAYAT</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedGoalLogs.map((log) => (
                      <TableRow key={log.id} className="dark:border-slate-800 dark:hover:bg-slate-800/50 group">
                        <TableCell className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums align-top sm:align-middle whitespace-nowrap">
                          {new Date(log.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="font-bold text-xs sm:text-sm dark:text-slate-200">
                          <div className="line-clamp-2 sm:line-clamp-none">{log.source}</div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-black text-xs sm:text-sm tabular-nums tracking-tighter align-top sm:align-middle whitespace-nowrap">
                          +{toIDRCurrency(log.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryOpen(false)} className="w-full h-11 bg-black dark:bg-white text-white dark:text-black font-black">Tutup Riwayat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
