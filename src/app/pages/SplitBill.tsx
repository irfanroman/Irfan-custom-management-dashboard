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
  
  // OCR Dialog
  const [showOCRDialog, setShowOCRDialog] = useState(false);

  const handleOCRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setOcrProgress(0);
      const scannedItems = await scannerService.scanReceipt(file, (progress) => {
        setOcrProgress(progress);
      });

      if (scannedItems.length === 0) {
        toast.error('Gagal mengekstrak item. Coba foto yang lebih jelas.');
      } else {
        const formattedItems = scannedItems.map(item => ({
          ...item,
          id: `${Date.now()}-${Math.random()}`,
          assigned_to: []
        }));
        setItems(prev => [...prev, ...formattedItems]);
        toast.success(`Berhasil mengekstrak ${scannedItems.length} item!`);
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
        splits[person] = splits[person] - (discountAmount * proportion);
      });
    }

    return splits;
  };

  const saveBill = async () => {
    if (!user) return;
    
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
  const totalAfterDiscount = Object.values(splits).reduce((sum, val) => sum + val, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Split Bill (Patungan)</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'history')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create">Bikin Patungan</TabsTrigger>
            <TabsTrigger value="history">Riwayat</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            {!showSummary ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Detail Tagihan</CardTitle>
                    <CardDescription>Masukkan info dasar tentang patungan ini</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="bill-title">Nama Acara / Tagihan</Label>
                      <Input
                        id="bill-title"
                        placeholder="Misal: Makan Malam, Belanja Bulanan"
                        value={billTitle}
                        onChange={(e) => setBillTitle(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowOCRDialog(true)}>
                        <Camera className="w-4 h-4 mr-2" />
                        Scan Nota / Struk
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Teman-teman</CardTitle>
                    <CardDescription>Siapa aja yang ikut patungan?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nama teman"
                        value={newParticipant}
                        onChange={(e) => setNewParticipant(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                      />
                      <Button onClick={addParticipant}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {participants.map((participant) => (
                        <Badge key={participant} variant="secondary" className="text-sm py-2 px-3">
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
                      <p className="text-sm text-gray-500">Belum ada orang ditambahkan</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Daftar Item</CardTitle>
                    <CardDescription>Apa aja yang dibeli?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>Nama Barang</Label>
                        <Input
                          placeholder="Misal: Burger"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                        />
                      </div>
                      <AmountInput
                        id="new-item-price"
                        label="Harga"
                        value={newItemPrice}
                        onChange={(value) => setNewItemPrice(value)}
                        className="w-48"
                      />
                      <Button onClick={addItem} className="mb-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {items.length > 0 && (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <Card key={item.id}>
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-semibold">{item.name}</h4>
                                  <p className="text-sm text-gray-600">{toIDRCurrency(item.price)}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(item.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                              
                              <div>
                                <Label className="text-xs text-gray-500 mb-2 block">Siapa yang bayar ini?</Label>
                                <div className="flex flex-wrap gap-2">
                                  {participants.map((participant) => (
                                    <Button
                                      key={participant}
                                      variant={item.assigned_to.includes(participant) ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => toggleItemAssignment(item.id, participant)}
                                    >
                                      {participant}
                                    </Button>
                                  ))}
                                </div>
                                {item.assigned_to.length === 0 && (
                                  <p className="text-xs text-red-500 mt-2">Belum ada yang nanggung</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {items.length === 0 && (
                      <p className="text-sm text-gray-500">Belum ada item ditambahkan</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Diskon (Opsional)</CardTitle>
                    <CardDescription>Ada diskon dari toko / restoran?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        {discountType === 'fixed' ? (
                          <AmountInput
                            id="discount-amount"
                            label="Jumlah Diskon"
                            value={discount}
                            onChange={(value) => setDiscount(value)}
                          />
                        ) : (
                          <div className="space-y-2">
                             <Label htmlFor="discount-percent">Persentase Diskon (%)</Label>
                             <Input 
                               id="discount-percent"
                               type="number"
                               value={discount || ''}
                               onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                               placeholder="0"
                             />
                          </div>
                        )}
                      </div>
                      <Select value={discountType} onValueChange={(v) => {
                        setDiscount(0);
                        setDiscountType(v as 'percentage' | 'fixed');
                      }}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">Rp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <Button onClick={saveBill} className="w-full" size="lg" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Receipt className="w-5 h-5 mr-2" />}
                      Hitung & Simpan Patungan
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Hasil Patungan</CardTitle>
                  <CardDescription>{billTitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2 pb-4 border-b">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">{toIDRCurrency(subtotalValue)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Diskon ({discountType === 'percentage' ? `${discount}%` : toIDRCurrency(discount)}):</span>
                        <span>-{toIDRCurrency(subtotalValue - totalAfterDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Bersama:</span>
                      <span>{toIDRCurrency(totalAfterDiscount)}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Tagihan Per Orang:</h4>
                    <div className="space-y-2">
                      {Object.entries(splits).map(([person, amount]) => (
                        <div key={person} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {person[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{person}</span>
                          </div>
                          <span className="text-lg font-bold">{toIDRCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={exportSummaryToPDF} variant="outline" className="flex-1">
                      <Download className="w-4 h-4 mr-2" />
                      Ekspor PDF
                    </Button>
                    <Button onClick={resetForm} variant="outline" className="flex-1">
                      Buat Baru
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Riwayat Patungan</CardTitle>
                <CardDescription>Cek catatan patungan kamu sebelumnya</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && bills.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : bills.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Belum ada catatan patungan</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bills.map((bill) => {
                      const billTotal = bill.bill_items?.reduce((sum: number, item: any) => sum + item.price, 0) || 0;
                      
                      return (
                        <Card key={bill.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-lg">{bill.title}</h4>
                                <p className="text-sm text-gray-600">
                                  {new Date(bill.created_at).toLocaleDateString('id-ID')}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {bill.participants.length} teman • {bill.bill_items?.length || 0} item
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold">{toIDRCurrency(billTotal)}</p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteBill(bill.id)}
                                  className="mt-2"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              {bill.participants.map((p: string) => (
                                <Badge key={p} variant="secondary">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Nota</DialogTitle>
            <DialogDescription>
              Upload foto struk belanjaan untuk ambil data item otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div 
              className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors ${
                isScanning ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              {isScanning ? (
                <div className="space-y-4">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-700">Sedang Memproses Nota...</p>
                    <Progress value={ocrProgress} className="h-2 w-full" />
                    <p className="text-xs text-blue-600">{ocrProgress}% Selesai</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="cursor-pointer" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Klik untuk upload atau foto nota
                  </p>
                  <p className="text-xs text-gray-400">
                    Mendukung JPG, PNG (Maks 5MB)
                  </p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/*" 
                capture="environment"
                onChange={handleOCRFileSelect}
                disabled={isScanning}
              />
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-700 leading-relaxed">
                <strong>Tips:</strong> Pastikan teks terlihat jelas, terang, dan kertas nota diposisikan rata.
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowOCRDialog(false)} disabled={isScanning}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
