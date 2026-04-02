import React from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Users, Wallet, LogOut, PieChart, Receipt, Cloud, Calendar } from 'lucide-react';

export function Dashboard() {
  const { user, logout } = useAuth();

  const features = [
    {
      title: 'Finance Tracker',
      description: 'Lacak pemasukan dan pengeluaran kamu dengan kategori dan analisis detail.',
      icon: TrendingUp,
      link: '/finance-tracker',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Split Bill (Patungan)',
      description: 'Bagi tagihan makan atau belanja bareng teman jadi lebih gampang.',
      icon: Users,
      link: '/split-bill',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Budget Planner',
      description: 'Atur anggaran bulanan dan pantau target pengeluaran kamu.',
      icon: PieChart,
      link: '/budget-planner',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Receipt Scanner',
      description: 'Scan struk belanja dan otomatis ekstrak detail transaksi.',
      icon: Receipt,
      link: '/receipt-scanner',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                FinanceHub
              </h1>
              <p className="text-xs text-gray-600">Manajer Keuangan Pribadi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-600">Selamat datang kembali,</p>
              <p className="font-semibold">{user?.username || 'User'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Keuangan Kamu
          </h2>
          <p className="text-gray-600">
            Kelola keuangan kamu secara efisien dengan alat bantu kami, sekarang tersinkronisasi aman dengan Supabase.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const CardComponent: any = feature.comingSoon ? 'div' : Link;
            const cardProps = feature.comingSoon ? {} : { to: feature.link };

            return (
              <CardComponent key={feature.title} {...cardProps} className={feature.comingSoon ? '' : 'block'}>
                <Card className={`h-full transition-all duration-300 hover:shadow-xl cursor-pointer relative overflow-hidden ${feature.comingSoon ? 'opacity-75' : ''}`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-10 rounded-full -mr-16 -mt-16`} />
                  
                  {feature.comingSoon && (
                    <div className="absolute top-4 right-4 bg-gray-900 text-white text-xs px-2 py-1 rounded-full">
                      Segera Hadir
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className={`w-16 h-16 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                      <Icon className={`w-8 h-8 bg-gradient-to-br ${feature.color} bg-clip-text text-transparent text-blue-600`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <Button
                      variant={feature.comingSoon ? "secondary" : "default"}
                      className="w-full"
                      disabled={feature.comingSoon}
                    >
                      {feature.comingSoon ? 'Segera Hadir' : 'Buka'}
                    </Button>
                  </CardContent>
                </Card>
              </CardComponent>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Fitur Aktif</CardDescription>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <CardTitle className="text-3xl">2</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Status Akun</CardDescription>
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <CardTitle className="text-lg">Tersinkronisasi</CardTitle>
            </CardHeader>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>Penyimpanan Data</CardDescription>
                <Cloud className="w-4 h-4 text-green-500" />
              </div>
              <CardTitle className="text-lg text-green-600 font-bold">Supabase Cloud</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </main>
    </div>
  );
}


