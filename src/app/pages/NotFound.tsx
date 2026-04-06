import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Home } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 transition-colors duration-500">
      <div className="text-center space-y-6">
        <h1 className="text-8xl font-black text-slate-900 dark:text-white tracking-tighter">404</h1>
        <div className="space-y-2">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">Halaman tidak ditemukan</p>
          <p className="text-slate-500 dark:text-slate-500 max-w-xs mx-auto font-medium">Ops! Sepertinya kamu tersesat di antah berantah finansial.</p>
        </div>
        <Link to="/">
          <Button className="font-bold h-12 px-8 bg-black dark:bg-white text-white dark:text-black shadow-xl hover:scale-105 transition-transform">
            <Home className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}

