import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { scannerService } from '../services/scanner';
import { formatNumberToIDR, toIDRCurrency } from '../utils/formatters';
import { AmountInput } from '../components/AmountInput';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ArrowLeft, Plus, Trash2, Users, Receipt, Download, Camera, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

import { ThemeToggle } from '../components/ThemeToggle';

export function SplitBill() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [showSummary, setShowSummary] = useState(false);
  
  // Create bill form
  const [billTitle, setBillTitle] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newParticipant, setNewParticipant] = useState('');
  const [tax, setTax] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(0);
  
  // OCR Dialog

  const [showOCRDialog, setShowOCRDialog] = useState(false);

  const handleOCRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setOcrProgress(0);
      const scannedData = await scannerService.scanReceipt(file, (progress) => {
        setOcrProgress(progress);
      });

      if (scannedData.items.length === 0) {
        toast.error('Gagal mengekstrak item. Coba foto yang lebih jelas.');
      } else {
        const formattedItems = scannedData.items.map(item => ({
          ...item,
          id: `${Date.now()}-${Math.random()}`,
          assigned_to: []
        }));
        setItems(prev => [...prev, ...formattedItems]);
        
        if (scannedData.tax > 0) setTax(scannedData.tax);
        if (scannedData.serviceCharge > 0) setServiceCharge(scannedData.serviceCharge);
        if (scannedData.discount > 0) {
          setDiscount(scannedData.discount);
          setDiscountType('fixed');
        }
        
        toast.success(`Berhasil mengekstrak ${scannedData.items.length} item!`);
        setShowOCRDialog(false);
      }
    } catch (error) {
      toast.error('Gagal scan. Silakan coba lagi.');
    } finally {
      setIsScanning(false);
      setOcrProgress(0);
    }
  };

  const loadBills = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const loadedBills = await dataService.getBills();
      setBills(loadedBills);
    } catch (error) {
      toast.error('Gagal memuat riwayat patungan');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBills();
    }
  }, [user, loadBills]);

  const addItem = () => {
    if (!newItemName || !newItemPrice) {
      toast.error('Masukkan nama item dan harga');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      price: newItemPrice,
      assigned_to: [],
    };

    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemPrice(0);
    toast.success('Item ditambahkan');
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const addParticipant = () => {
    if (!newParticipant.trim()) {
      toast.error('Masukkan nama teman');
      return;
    }

    if (participants.includes(newParticipant)) {
      toast.error('Nama sudah ada');
      return;
    }

    setParticipants([...participants, newParticipant]);
    setNewParticipant('');
    toast.success('Teman ditambahkan');
  };

  const removeParticipant = (participant: string) => {
    setParticipants(participants.filter(p => p !== participant));
    setItems(items.map(item => ({
      ...item,
      assigned_to: item.assigned_to.filter((p: string) => p !== participant),
    })));
  };

  const toggleItemAssignment = (itemId: string, participant: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        if (item.assigned_to.includes(participant)) {
          return {
            ...item,
            assigned_to: item.assigned_to.filter((p: string) => p !== participant),
          };
        } else {
          return {
            ...item,
            assigned_to: [...item.assigned_to, participant],
          };
        }
      }
      return item;
    }));
  };

  const calculateSplits = () => {
    const splits: { [key: string]: number } = {};
    participants.forEach(p => splits[p] = 0);

    items.forEach(item => {
      if (item.assigned_to.length > 0) {
        const splitAmount = item.price / item.assigned_to.length;
        item.assigned_to.forEach((person: string) => {
          splits[person] += splitAmount;
        });
      }
    });

    const subtotal = Object.values(splits).reduce((sum, val) => sum + val, 0);
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      discountAmount = (subtotal * discount) / 100;
    } else {
      discountAmount = discount;
    }

    if (subtotal > 0) {
      Object.keys(splits).forEach(person => {
        const proportion = splits[person] / subtotal;
        splits[person] = splits[person] - (discountAmount * proportion) + (tax * proportion) + (serviceCharge * proportion);
      });
    }

    return splits;
  };

  const saveBill = async () => {
    if (!billTitle) {
      toast.error('Masukkan judul patungan');
      return;
    }

    if (items.length === 0) {
      toast.error('Tambahkan minimal satu item');
      return;
    }

    if (participants.length === 0) {
      toast.error('Tambahkan minimal satu teman');
      return;
    }

    const hasUnassignedItems = items.some(item => item.assigned_to.length === 0);
    if (hasUnassignedItems) {
      toast.error('Semua item harus ada yang nanggung');
      return;
    }

    if (!user) {
      setShowSummary(true);
      toast.success('Patungan selesai dihitung!');
      return;
    }

    try {
      setIsLoading(true);
      const billData = {
        title: billTitle,
        participants,
        discount,
        discount_type: discountType,
        user_id: user.id,
      };

      const billItems = items.map(item => ({
        name: item.name,
        price: item.price,
        assigned_to: item.assigned_to,
      }));

      await dataService.addBill(billData, billItems);
      loadBills();
      setShowSummary(true);
      toast.success('Catatan patungan disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan ke database');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setBillTitle('');
    setItems([]);
    setParticipants([]);
    setDiscount(0);
    setDiscountType('percentage');
    setTax(0);
    setServiceCharge(0);
    setNewItemName('');
    setNewItemPrice(0);
    setNewParticipant('');
    setShowSummary(false);
  };

  const deleteBill = async (billId: string) => {
    if (!user) return;
    
    if (window.confirm('Yakin ingin menghapus catatan ini?')) {
      try {
        await dataService.deleteBill(billId);
        loadBills();
        toast.success('Dihapus');
      } catch (error) {
        toast.error('Gagal menghapus');
      }
    }
  };

  const exportSummaryToPDF = () => {
    const doc = new jsPDF();
    const splits = calculateSplits();
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    
    doc.setFontSize(20);
    doc.text('Ringkasan Patungan', 20, 20);
    doc.setFontSize(12);
    doc.text(billTitle || 'Tanpa Judul', 20, 30);
    doc.text(new Date().toLocaleDateString('id-ID'), 20, 38);
    
    doc.setFontSize(14);
    doc.text('Daftar Item:', 20, 50);
    doc.setFontSize(10);
    let yPos = 58;
    items.forEach(item => {
      doc.text(`${item.name} - ${toIDRCurrency(item.price)}`, 25, yPos);
      doc.text(`Ditanggung oleh: ${item.assigned_to.join(', ')}`, 25, yPos + 5);
      yPos += 12;
    });
    
    yPos += 5;
    doc.setFontSize(14);
    doc.text('Ringkasan Total:', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${toIDRCurrency(subtotal)}`, 25, yPos);
    yPos += 6;
    
    if (discount > 0) {
      const discountAmount = discountType === 'percentage' 
        ? (subtotal * discount) / 100 
        : discount;
      doc.text(`Diskon: -${toIDRCurrency(discountAmount)} (${discountType === 'percentage' ? `${discount}%` : 'tetap'})`, 25, yPos);
      yPos += 6;
    }
    
    const total = Object.values(splits).reduce((sum, val) => sum + val, 0);
    doc.text(`Total: ${toIDRCurrency(total)}`, 25, yPos);
    yPos += 10;
    
    doc.setFontSize(14);
    doc.text('Tagihan Per Orang:', 20, yPos);
    yPos += 8;
    doc.setFontSize(12);
    
    Object.entries(splits).forEach(([person, amount]) => {
      doc.text(`${person}: ${toIDRCurrency(amount)}`, 25, yPos);
      yPos += 8;
    });
    
    doc.save(`patungan-${Date.now()}.pdf`);
    toast.success('PDF berhasil diekspor');
  };

  const splits = calculateSplits();
  const subtotalValue = items.reduce((sum, item) => sum + item.price, 0);
  const actualDiscountAmount = discountType === 'percentage' ? (subtotalValue * discount) / 100 : discount;
  const totalAfterDiscount = subtotalValue - actualDiscountAmount + tax + serviceCharge;
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
      <header className="bg-white/80 dark:bg-slate-900/80 border-b dark:border-slate-800 sticky top-0 z-10 shadow-sm backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="dark:text-white dark:hover:bg-slate-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <h1 className="text-xl font-bold dark:text-white">Split Bill (Patungan)</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'history')}>
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 dark:bg-slate-800 p-1">
            <TabsTrigger value="create" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Bikin Patungan</TabsTrigger>
            <TabsTrigger value="history" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Riwayat</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6 pt-4">
            {!showSummary ? (
              <>
                <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Detail Tagihan</CardTitle>
                    <CardDescription className="dark:text-slate-400">Masukkan info dasar tentang patungan ini</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bill-title" className="dark:text-slate-300">Nama Acara / Tagihan</Label>
                      <Input
                        id="bill-title"
                        placeholder="Misal: Makan Malam, Belanja Bulanan"
                        value={billTitle}
                        onChange={(e) => setBillTitle(e.target.value)}
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowOCRDialog(true)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Camera className="w-4 h-4 mr-2" />
                        Scan Nota / Struk
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Teman-teman</CardTitle>
                    <CardDescription className="dark:text-slate-400">Siapa aja yang ikut patungan?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nama teman"
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                        className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                      <Button onClick={addParticipant} className="dark:bg-white dark:text-black dark:hover:bg-gray-200">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {participants.map((participant) => (
                        <Badge key={participant} variant="secondary" className="text-sm py-2 px-3 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                          <Users className="w-3 h-3 mr-2" />
                          {participant}
                          <button
                            onClick={() => removeParticipant(participant)}
                            className="ml-2 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    
                    {participants.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-slate-500">Belum ada orang ditambahkan</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Daftar Item</CardTitle>
                    <CardDescription className="dark:text-slate-400">Apa aja yang dibeli?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="dark:text-slate-300">Nama Barang</Label>
                        <Input
                          placeholder="Misal: Burger"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        />
                      </div>
                      <AmountInput
                        id="new-item-price"
                        label="Harga"
                        value={newItemPrice}
                        onChange={(value) => setNewItemPrice(value)}
                        className="w-48 dark:text-white"
                      />
                      <Button onClick={addItem} className="mb-0 dark:bg-white dark:text-black dark:hover:bg-gray-200">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {items.length > 0 && (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <Card key={item.id} className="dark:bg-slate-800/50 dark:border-slate-700 shadow-sm transition-shadow hover:shadow-md">
                            <CardContent className="pt-4 px-4">
                              <div className="flex items-start justify-between mb-4">
                                <div>
                                  <h4 className="font-semibold dark:text-white">{item.name}</h4>
                                  <p className="text-sm text-gray-600 dark:text-slate-400">{toIDRCurrency(item.price)}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(item.id)}
                                  className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                              
                              <div>
                                <Label className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-500 mb-3 block font-bold">Siapa yang bayar ini?</Label>
                                <div className="flex flex-wrap gap-2">
                                  {participants.map((participant) => (
                                    <Button
                                      key={participant}
                                      variant={item.assigned_to.includes(participant) ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleItemAssignment(item.id, participant)}
                                      className={`text-xs font-semibold px-4 transition-all ${
                                        item.assigned_to.includes(participant) 
                                        ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90' 
                                        : 'dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
                                      }`}
                                    >
                                      {participant}
                                    </Button>
                                  ))}
                                </div>
                                {item.assigned_to.length === 0 && (
                                  <p className="text-[10px] font-bold text-red-500 mt-3 flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                                    BELUM ADA YANG NANGGUNG
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {items.length === 0 && (
                      <p className="text-sm text-gray-500 dark:text-slate-500">Belum ada item ditambahkan</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="dark:text-white">Biaya Tambahan & Diskon</CardTitle>
                    <CardDescription className="dark:text-slate-400">Pajak, Ongkir, dan Diskon dari toko / restoran</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <AmountInput
                          id="tax-amount"
                          label="Pajak (Rp)"
                          value={tax}
                          onChange={(value) => setTax(value)}
                          className="dark:text-white"
                        />
                      </div>
                      <div>
                        <AmountInput
                          id="service-amount"
                          label="Service Charge / Ongkir (Rp)"
                          value={serviceCharge}
                          onChange={(value) => setServiceCharge(value)}
                          className="dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        {discountType === 'fixed' ? (
                          <AmountInput
                            id="discount-amount"
                            label="Jumlah Diskon"
                            value={discount}
                            onChange={(value) => setDiscount(value)}
                            className="dark:text-white"
                          />
                        ) : (
                          <div className="space-y-2">
                             <Label htmlFor="discount-percent" className="dark:text-slate-300">Persentase Diskon (%)</Label>
                             <Input 
                               id="discount-percent"
                               type="number"
                               value={discount || ''}
                               onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                               placeholder="0"
                               className="dark:bg-slate-800 dark:border-slate-700 dark:text-white h-11"
                             />
                          </div>
                        )}
                      </div>
                      <Select value={discountType} onValueChange={(v) => {
                        setDiscount(0);
                        setDiscountType(v as 'percentage' | 'fixed');
                      }}>
                        <SelectTrigger className="w-32 h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">Rp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {items.length > 0 && (
                  <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/30 dark:bg-blue-900/10 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-blue-900 dark:text-blue-400 font-bold">Total Sementara</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                        <span>Subtotal Item:</span>
                        <span>{toIDRCurrency(subtotalValue)}</span>
                      </div>
                      {tax > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                          <span>Pajak:</span>
                          <span>+{toIDRCurrency(tax)}</span>
                        </div>
                      )}
                      {serviceCharge > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
                          <span>Service/Ongkir:</span>
                          <span>+{toIDRCurrency(serviceCharge)}</span>
                        </div>
                      )}
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>Diskon:</span>
                          <span>-{toIDRCurrency(discountType === 'percentage' ? (subtotalValue * discount) / 100 : discount)}</span>
                        </div>
                      )}
                      <div className="pt-3 mt-1 border-t border-blue-200 dark:border-blue-900/40 flex justify-between font-black text-xl text-blue-900 dark:text-blue-300 tracking-tight">
                        <span>Total Keseluruhan:</span>
                        <span>{toIDRCurrency(totalAfterDiscount)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm">
                  <CardContent className="pt-6 px-6 pb-6">
                    <Button onClick={saveBill} className="w-full h-12 bg-black dark:bg-white text-white dark:text-black font-bold text-base shadow-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all active:scale-[0.98]" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Receipt className="w-5 h-5 mr-2" />}
                      {user ? 'Hitung & Simpan Patungan' : 'Hitung Patungan'}
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="dark:bg-slate-900/50 dark:border-slate-800 backdrop-blur-sm shadow-2xl">
                <CardHeader className="text-center pt-8">
                  <CardTitle className="text-3xl font-black dark:text-white tracking-tight">Hasil Patungan</CardTitle>
                  <CardDescription className="text-lg dark:text-slate-400 font-medium">{billTitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 px-8 pb-10">
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700">
                    <div className="flex justify-between text-base font-bold dark:text-white">
                      <span>Subtotal Item:</span>
                      <span>{toIDRCurrency(subtotalValue)}</span>
                    </div>
                    {tax > 0 && (
                      <div className="flex justify-between text-gray-500 dark:text-slate-400 text-sm">
                        <span>Pajak:</span>
                        <span>+{toIDRCurrency(tax)}</span>
                      </div>
                    )}
                    {serviceCharge > 0 && (
                      <div className="flex justify-between text-gray-500 dark:text-slate-400 text-sm">
                        <span>Service/Ongkir:</span>
                        <span>+{toIDRCurrency(serviceCharge)}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                        <span>Diskon ({discountType === 'percentage' ? `${discount}%` : 'tetap'}):</span>
                        <span>-{toIDRCurrency(discountType === 'percentage' ? (subtotalValue * discount) / 100 : discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-2xl font-black pt-4 border-t dark:border-slate-700 dark:text-white tracking-tighter">
                      <span>Grand Total:</span>
                      <span>{toIDRCurrency(totalAfterDiscount)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-slate-500 mb-4 ml-1">Tagihan Per Orang:</h4>
                    <div className="space-y-3">
                      {Object.entries(splits).map(([person, amount]) => (
                        <div key={person} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 transition-transform hover:scale-[1.01]">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black font-black shadow-md">
                              {person[0].toUpperCase()}
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white">{person}</span>
                          </div>
                          <span className="text-xl font-black text-black dark:text-white tabular-nums tracking-tight">{toIDRCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={exportSummaryToPDF} variant="outline" className="flex-1 h-12 font-bold dark:border-slate-700 dark:hover:bg-slate-800">
                      <Download className="w-4 h-4 mr-2" />
                      Ekspor PDF
                    </Button>
                    <Button onClick={resetForm} variant="outline" className="flex-1 h-12 font-bold dark:border-slate-700 dark:hover:bg-slate-800">
                      Buat Baru
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="pt-4">
            <Card className="dark:bg-slate-900/50 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-white font-bold">Riwayat Patungan</CardTitle>
                <CardDescription className="dark:text-slate-400">Cek catatan patungan kamu sebelumnya</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-8">
                {!user ? (
                  <div className="text-center py-12 space-y-6">
                    <div className="bg-gray-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400 dark:text-slate-500 shadow-inner">
                      <Users className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Login untuk Simpan Riwayat</h3>
                      <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto text-sm">
                        Buat akun atau masuk untuk bisa melihat riwayat patungan dan mengaksesnya kapan saja.
                      </p>
                    </div>
                    <Link to="/login" className="inline-block pt-2">
                      <Button className="font-bold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 px-8 py-5">Masuk / Daftar</Button>
                    </Link>
                  </div>
                ) : isLoading && bills.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : bills.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-slate-500">
                    <Receipt className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-lg">Belum ada catatan patungan</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bills.map((bill) => {
                      const billTotal = bill.bill_items?.reduce((sum: number, item: any) => sum + item.price, 0) || 0;
                      
                      return (
                        <Card key={bill.id} className="dark:bg-slate-800/50 dark:border-slate-700 transition-all hover:shadow-md cursor-pointer group">
                          <CardContent className="pt-6 px-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="space-y-1">
                                <h4 className="font-bold text-lg dark:text-white group-hover:text-primary transition-colors">{bill.title}</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                                  {new Date(bill.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                                  {bill.participants.length} teman • {bill.bill_items?.length || 0} item
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-black text-black dark:text-white tracking-tighter">{toIDRCurrency(billTotal)}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBill(bill.id)}
                                  className="mt-3 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 border-t dark:border-slate-700/50 pt-4 mt-2">
                              {bill.participants.map((p: string) => (
                                <Badge key={p} variant="secondary" className="text-[10px] font-bold px-2.5 dark:bg-slate-700 dark:text-slate-300">
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showOCRDialog} onOpenChange={setShowOCRDialog}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black dark:text-white tracking-tight">Scan Nota</DialogTitle>
            <DialogDescription className="font-medium dark:text-slate-400">
              Upload foto struk belanjaan untuk ambil data item otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                isScanning 
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-slate-700 hover:border-black dark:hover:border-white hover:bg-gray-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleOCRFileSelect}
                accept="image/*"
                className="hidden"
              />
              {isScanning ? (
                <div className="space-y-6">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 mx-auto animate-spin text-black dark:text-white" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-black dark:text-white uppercase tracking-widest">Sedang Memproses Nota...</p>
                    <Progress value={ocrProgress} className="h-2 w-full dark:bg-slate-800" />
                    <p className="text-xs font-bold text-gray-500 dark:text-slate-400 tabular-nums">{ocrProgress}% SELESAI</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="cursor-pointer space-y-4" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400 dark:text-slate-500 shadow-inner">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-black dark:text-white">
                      Klik untuk upload atau foto nota
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 font-medium mt-1">
                      Mendukung JPG, PNG (Maks 5MB)
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
              <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-500" />
                Tips Scan Akurat
              </p>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium leading-relaxed">
                Pastikan foto nota tegak lurus, pencahayaan cukup, dan teks terbaca jelas (terutama Nama Barang & Harga).
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
