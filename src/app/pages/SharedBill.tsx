import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { dataService } from '../services/dataService';
import { toIDRCurrency } from '../utils/formatters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, ArrowLeft, Clock, History, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function SharedBill() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    async function fetchBill() {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await dataService.getBillById(id);
        
        if (!data) {
          setError('Data patungan tidak ditemukan.');
          return;
        }

        // Check expiry (5 hours)
        const createdAt = new Date(data.created_at).getTime();
        const now = new Date().getTime();
        const fiveHoursInMs = 5 * 60 * 60 * 1000;
        
        if (now - createdAt > fiveHoursInMs) {
          setIsExpired(true);
        }

        setBill(data);
      } catch (err) {
        setError('Gagal memuat data patungan. Link mungkin salah atau database error.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBill();
  }, [id]);

  const calculateSplits = () => {
    if (!bill || !bill.bill_items) return {};
    
    const splits: { [key: string]: number } = {};
    bill.participants.forEach((p: string) => splits[p] = 0);

    bill.bill_items.forEach((item: any) => {
      if (item.assigned_to.length > 0) {
        const splitAmount = item.price / item.assigned_to.length;
        item.assigned_to.forEach((person: string) => {
          splits[person] += splitAmount;
        });
      }
    });

    const subtotal = Object.values(splits).reduce((sum, val) => sum + val, 0);
    let discountAmount = 0;
    
    if (bill.discount_type === 'percentage') {
      discountAmount = (subtotal * bill.discount) / 100;
    } else {
      discountAmount = bill.discount;
    }

    if (subtotal > 0) {
      Object.keys(splits).forEach(person => {
        const proportion = splits[person] / subtotal;
        splits[person] = splits[person] - (discountAmount * proportion);
      });
    }

    return splits;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium animate-pulse text-slate-500">Membuka Patungan...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 dark:bg-slate-900 border-none shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold dark:text-white mb-2">Waduh!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{error || 'Data tidak ditemukan.'}</p>
          <Link to="/">
            <Button className="w-full h-12 bg-black dark:bg-white text-white dark:text-black font-bold">
              Kembali ke Beranda
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8 dark:bg-slate-900 border-none shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
          <Clock className="w-16 h-16 text-red-500 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold dark:text-white mb-2">Link Kadaluarsa</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Link berbagi ini sudah lewat 5 jam dan tidak aktif lagi demi privasi dan keamanan.
          </p>
          <Link to="/">
            <Button className="w-full h-12 bg-black dark:bg-white text-white dark:text-black font-bold">
              Buat Patungan Baru
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const splits = calculateSplits();
  const subtotalValue = bill.bill_items.reduce((sum: number, item: any) => sum + item.price, 0);
  const discountAmount = bill.discount_type === 'percentage' ? (subtotalValue * bill.discount) / 100 : bill.discount;
  const totalAmount = subtotalValue - discountAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
      <header className="bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 sticky top-0 z-10 shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <div className="flex items-center text-sm font-black text-slate-900 dark:text-white hover:opacity-70 transition-opacity cursor-pointer tracking-tighter">
                <ArrowLeft className="w-4 h-4 mr-1" />
                POWER-FULL
              </div>
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm shadow-2xl overflow-hidden border-none">
          <div className="bg-black dark:bg-white p-2 text-center">
            <p className="text-[10px] font-black tracking-[0.2em] text-white dark:text-black uppercase">Shared Result (Expires in 5h)</p>
          </div>
          
          <CardHeader className="text-center pt-10">
            <CardTitle className="text-4xl font-black dark:text-white tracking-tighter mb-2">Ringkasan Patungan</CardTitle>
            <CardDescription className="text-lg flex items-center justify-center gap-2 font-bold dark:text-slate-400">
              <History className="w-4 h-4" />
              {bill.title}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 px-8 pb-12">
            <div className="space-y-4 p-8 bg-black dark:bg-white rounded-[2rem] text-white dark:text-black shadow-2xl scale-[1.02] transform transition-transform hover:scale-[1.03]">
              <div className="flex justify-between items-end opacity-60">
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Tagihan</span>
                <span className="text-[10px] font-bold">
                  {new Date(bill.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-md">
                {toIDRCurrency(totalAmount)}
              </div>
              <div className="pt-6 border-t border-white/10 dark:border-black/10 flex justify-between text-[10px] font-black uppercase tracking-wider opacity-60">
                <span>Subtotal: {toIDRCurrency(subtotalValue)}</span>
                {bill.discount > 0 && <span>Diskon: -{toIDRCurrency(discountAmount)}</span>}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-500 mb-6 ml-1">Rincian Tabungan Teman</h4>
              <div className="space-y-3">
                {Object.entries(splits).map(([person, amount]) => (
                  <div key={person} className="flex justify-between items-center p-5 bg-white dark:bg-slate-800/80 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-slate-900 font-black text-xl shadow-lg uppercase">
                        {person[0]}
                      </div>
                      <span className="font-black text-slate-900 dark:text-white tracking-tight text-lg">{person}</span>
                    </div>
                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">{toIDRCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t dark:border-slate-800 text-center space-y-6">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 font-bold flex items-center justify-center gap-2">
                   <Clock className="w-4 h-4" />
                   Segera bayar tagihanmu ya! Link ini akan kadaluarsa.
                </p>
              </div>
              
              <Link to="/login">
                <Button className="w-full h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-black text-base shadow-xl hover:opacity-90 transition-all active:scale-[0.98]">
                  Coba Power-Full Sendiri
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
