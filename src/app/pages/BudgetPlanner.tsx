import React, { useState, useEffect, useCallback } from 'react';
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
            <h1 className="text-xl font-bold">Budget Planner</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-green-100 bg-green-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-green-600 font-medium capitalize">Total Semua Tabungan</CardDescription>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <CardTitle className="text-3xl text-green-900">{toIDRCurrency(totalSaved)}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-blue-600 font-medium capitalize">Total Target Terdaftar</CardDescription>
                <ListChecks className="w-5 h-5 text-blue-500" />
              </div>
              <CardTitle className="text-3xl text-blue-900">{toIDRCurrency(totalTarget)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Goals Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-red-500" />
            Target Tabungan
          </h2>
          <Button onClick={() => setIsAddingGoal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Target
          </Button>
        </div>

        {goals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Belum ada target</h3>
            <p className="text-gray-500">Mulai buat rencana tabungan untuk impian kamu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => {
              const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
              return (
                <Card key={goal.id} className="overflow-hidden transition-all hover:shadow-lg border-white shadow-sm hover:border-blue-100">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-1">
                      <CardTitle className="text-lg font-bold">{goal.name}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedGoal(goal);
                          setGoalFormData({ name: goal.name, target_amount: goal.target_amount });
                          setIsEditingGoal(true);
                        }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(goal.id)}>
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Target: {toIDRCurrency(goal.target_amount)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-600">Terdaftar</span>
                      <span className="font-bold text-blue-600">{toIDRCurrency(goal.current_amount)}</span>
                    </div>
                    <Progress value={progress} className="h-2 mb-2" />
                    <div className="flex justify-between items-center">
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7 px-2 text-gray-500 flex items-center gap-1"
                        onClick={() => handleViewHistory(goal)}
                      >
                        <History className="w-3 h-3" />
                        Lihat Riwayat
                      </Button>
                      <p className="text-right text-xs font-bold text-gray-500">
                        {progress.toFixed(1)}%
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50/50 pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full bg-white hover:bg-blue-50 hover:text-blue-600 border-blue-100"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setIsUpdatingProgress(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tambah Tabungan
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Target Baru</DialogTitle>
            <DialogDescription>Tentukan apa yang ingin kamu capai.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Nama Target</Label>
              <Input
                id="goal-name"
                placeholder="Contoh: Beli Laptop Baru"
                value={goalFormData.name}
                onChange={(e) => setGoalFormData({ ...goalFormData, name: e.target.value })}
              />
            </div>
            <AmountInput
              id="goal-amount"
              label="Harga Tujuan"
              value={goalFormData.target_amount}
              onChange={(val) => setGoalFormData({ ...goalFormData, target_amount: val })}
            />
          </div>
          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setIsAddingGoal(false)}>Batal</Button>
            <Button onClick={handleAddGoal}>Simpan Target</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditingGoal} onOpenChange={setIsEditingGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goal-name">Nama Target</Label>
              <Input
                id="edit-goal-name"
                value={goalFormData.name}
                onChange={(e) => setGoalFormData({ ...goalFormData, name: e.target.value })}
              />
            </div>
            <AmountInput
              id="edit-goal-amount"
              label="Harga Tujuan"
              value={goalFormData.target_amount}
              onChange={(val) => setGoalFormData({ ...goalFormData, target_amount: val })}
            />
          </div>
          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setIsEditingGoal(false)}>Batal</Button>
            <Button onClick={handleEditGoal}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Progress Dialog */}
      <Dialog open={isUpdatingProgress} onOpenChange={setIsUpdatingProgress}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Tabungan</DialogTitle>
            <DialogDescription>
              Tambah saldo untuk target: <strong>{selectedGoal?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <AmountInput
              id="progress-amount"
              label="Jumlah Tabungan"
              value={progressAmount}
              onChange={(val) => setProgressAmount(val)}
            />
            <div className="space-y-2">
              <Label htmlFor="progress-source">Sumber Dana (Opsional)</Label>
              <Input
                id="progress-source"
                placeholder="Contoh: Gaji bulan April / Bonus"
                value={progressSource}
                onChange={(e) => setProgressSource(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setIsUpdatingProgress(false)}>Batal</Button>
            <Button onClick={handleUpdateProgress}>Tambah Sekarang</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Riwayat Tabungan: {selectedGoal?.name}
            </DialogTitle>
            <DialogDescription>
              Detail penambahan dana untuk target ini.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-[300px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGoalLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        Belum ada riwayat penambahan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedGoalLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{log.source}</TableCell>
                        <TableCell className="text-right text-green-600 font-bold">
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
            <Button onClick={() => setIsHistoryOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
