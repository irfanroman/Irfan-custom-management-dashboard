import React from 'react';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LineChart, Users, Wallet, LogOut, Target, Scan, LucideIcon } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function Dashboard() {
  const { user, logout } = useAuth();

  const features = [
    {
      title: 'Finance Tracker',
      description: 'Lacak pemasukan dan pengeluaran kamu dengan kategori dan analisis detail.',
      icon: LineChart,
      link: '/finance-tracker',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      shadowColor: 'hover:shadow-blue-200 dark:hover:shadow-blue-900/30',
    },
    {
      title: 'Split Bill',
      description: 'Bagi tagihan makan atau belanja bareng teman jadi lebih gampang.',
      icon: Users,
      link: '/split-bill',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      shadowColor: 'hover:shadow-purple-200 dark:hover:shadow-purple-900/30',
    },
    {
      title: 'Budget Planner',
      description: 'Atur anggaran bulanan dan pantau target pengeluaran kamu.',
      icon: Target,
      link: '/budget-planner',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      shadowColor: 'hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30',
    },
    {
      title: 'Receipt Scanner',
      description: 'Scan struk belanja dan otomatis ekstrak detail transaksi.',
      icon: Scan,
      link: '/receipt-scanner',
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      shadowColor: 'hover:shadow-orange-200 dark:hover:shadow-orange-900/30',
      comingSoon: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 font-sans transition-colors duration-500">
      {/* Header */}
      <header className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b dark:border-slate-800 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-lg">
              <Wallet className="w-6 h-6 text-white dark:text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-black dark:text-white tracking-tight">
                Pan Dashboard
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 font-bold">Semua Tools yang Kamu Butuhkan</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500 dark:text-gray-400">Selamat datang{user ? ' kembali,' : ','}</p>
              <p className="font-bold text-sm tracking-tight text-black dark:text-white">{user?.username || 'Pengunjung'}</p>
            </div>
            
            <ThemeToggle />

            {user ? (
              <Button variant="outline" size="sm" onClick={() => logout()} className="border-black dark:border-white text-black dark:text-white hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all font-semibold">
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            ) : (
              <Link to="/login">
                <Button className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-all font-semibold shadow-lg" size="sm">
                  Masuk / Daftar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* Welcome Section */}
        <div className="mb-14 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4 tracking-tight">
            Tools Yang Tersedia
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
            Jelajahi berbagai tools yang dirancang khusus untuk mempermudah hidupmu hari ini.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-10">
          {features.map((feature) => {
            const Icon = feature.icon;
            const CardComponent: any = feature.comingSoon ? 'div' : Link;
            const cardProps = feature.comingSoon ? {} : { to: feature.link };

            return (
              <CardComponent key={feature.title} {...cardProps} className={feature.comingSoon ? '' : 'block transform transition-all duration-300 hover:-translate-y-2'}>
                <Card className={`h-full transition-all duration-300 hover:shadow-2xl ${feature.shadowColor} cursor-pointer relative overflow-hidden ${feature.comingSoon ? 'opacity-75 grayscale-[0.5]' : ''} border-white/50 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg`}>
                  <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${feature.color} opacity-[0.03] dark:opacity-[0.07] rounded-full -mr-20 -mt-20`} />
                  
                  {feature.comingSoon && (
                    <div className="absolute top-4 right-4 bg-black dark:bg-white text-white dark:text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">
                      Segera Hadir
                    </div>
                  )}
                  
                  <CardHeader className="pt-10 px-8">
                    <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-8 shadow-sm`}>
                      <Icon className="w-6 h-6 text-black dark:text-white stroke-[2px]" />
                    </div>
                    <CardTitle className="text-xl font-bold text-black dark:text-white tracking-tight mb-3">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 font-medium">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-10 px-8">
                    <Button
                      variant={feature.comingSoon ? "secondary" : "default"}
                      className={`w-full font-bold h-11 text-xs shadow-xl transition-all ${
                        !feature.comingSoon 
                        ? 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 border-none' 
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600'
                      }`}
                      disabled={feature.comingSoon}
                    >
                      {feature.comingSoon ? 'Mohon Tunggu' : 'Buka Sekarang'}
                    </Button>
                  </CardContent>
                </Card>
              </CardComponent>
            );
          })}
        </div>
      </main>
    </div>
  );
}


