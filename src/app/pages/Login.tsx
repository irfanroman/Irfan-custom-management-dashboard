import React, { useState } from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Wallet, TrendingUp, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ThemeToggle } from '../components/ThemeToggle';

export function Login() {
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', username: '', confirmPassword: '' });

  // Redirect if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.email || !loginForm.password) {
      toast.error('Harap isi semua kolom');
      return;
    }

    setIsSubmitting(true);
    const result = await login(loginForm.email, loginForm.password);
    setIsSubmitting(false);
    
    if (result.success) {
      toast.success('Login berhasil!');
    } else {
      toast.error(result.error || 'Email atau password salah');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerForm.email || !registerForm.password || !registerForm.username || !registerForm.confirmPassword) {
      toast.error('Harap isi semua kolom');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setIsSubmitting(true);
    const result = await register(registerForm.email, registerForm.password, registerForm.username);
    setIsSubmitting(false);
    
    if (result.success) {
      toast.success('Pendaftaran berhasil! Silakan cek email kamu.');
    } else {
      toast.error(result.error || 'Pendaftaran gagal');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 transition-colors duration-500">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12 items-center">
        {/* Left Side - Branding */}
        <div className="hidden md:block">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
                <Wallet className="w-8 h-8 text-white dark:text-black" />
              </div>
              <h1 className="text-4xl font-bold text-black dark:text-white tracking-tight">
                Pan Dashboard
              </h1>
            </div>
            
            <p className="text-2xl text-gray-600 dark:text-gray-400 font-medium">
              Semua Tools yang Kamu Butuhkan
            </p>
            
            <div className="space-y-6 pt-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-black dark:text-white text-lg">Pantau Pengeluaran</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Monitor pengeluaran dengan analisis dan wawasan detail</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-black dark:text-white text-lg">Patungan Jadi Mudah</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Bagi tagihan dengan teman dan keluarga tanpa ribet</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-black dark:text-white text-lg">Ekspor Laporan</h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">Unduh data keuangan kamu dalam format PDF atau Excel</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login/Register Form */}
        <Card className="shadow-2xl border-white/50 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold dark:text-white">Selamat Datang</CardTitle>
            <CardDescription className="dark:text-gray-400 font-medium text-base">Masuk atau buat akun baru untuk memulai</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100 dark:bg-slate-800 p-1">
                <TabsTrigger value="login" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Masuk</TabsTrigger>
                <TabsTrigger value="register" className="dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-white">Daftar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="dark:text-gray-300 font-semibold">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Masukkan email kamu"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="dark:text-gray-300 font-semibold">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Masukkan password kamu"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full h-11 bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-gray-800 dark:hover:bg-gray-200 shadow-xl" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Masuk
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" className="dark:text-gray-300 font-semibold">Username</Label>
                    <Input
                      id="register-username"
                      type="text"
                      placeholder="Pilih username"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                      className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="dark:text-gray-300 font-semibold">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Masukkan email kamu"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                      className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="dark:text-gray-300 font-semibold">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Pilih password (min. 6 karakter)"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                      className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm" className="dark:text-gray-300 font-semibold">Konfirmasi Password</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="Ulangi password kamu"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                      className="h-11 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full h-11 bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-gray-800 dark:hover:bg-gray-200 shadow-xl" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Buat Akun
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


