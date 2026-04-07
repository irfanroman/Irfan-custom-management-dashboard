import React from 'react';
import { Link } from 'react-router';
import { Wallet, Mail, Globe, Github, Twitter } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const features = [
    { name: 'Split Bill', href: '/split-bill' },
    { name: 'Finance Tracker', href: '/finance-tracker' },
    { name: 'Budget Planner', href: '/budget-planner' },
  ];

  const socialLinks = [
    { icon: Globe, href: '#', label: 'Website' },
    { icon: Github, href: '#', label: 'GitHub' },
    { icon: Twitter, href: '#', label: 'Twitter' },
  ];

  return (
    <footer className="w-full bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 transition-colors duration-500">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-lg">
                <Wallet className="w-5 h-5 text-white dark:text-black" />
              </div>
              <h2 className="text-xl font-bold text-black dark:text-white tracking-tight">
                Pan Dashboard
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Solusi manajemen keuangan modern untuk membantu kamu mengelola pengeluaran dengan lebih cerdas dan efisien.
            </p>
          </div>

          {/* Quick Links / Features */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">
              Fitur Utama
            </h3>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature.name}>
                  <Link
                    to={feature.href}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors font-medium"
                  >
                    {feature.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">
              Hubungi Kami
            </h3>
            <div className="flex flex-col space-y-3">
              <a
                href="mailto:hello@pandashboard.id"
                className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors font-medium group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-black dark:group-hover:bg-white transition-colors">
                  <Mail className="w-4 h-4 group-hover:text-white dark:group-hover:text-black" />
                </div>
                <span>hello@pandashboard.id</span>
              </a>
            </div>
          </div>

          {/* Social / Newsletter Placeholder */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">
              Ikuti Kami
            </h3>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-black dark:hover:bg-white text-gray-600 dark:text-gray-400 hover:text-white dark:hover:text-black transition-all shadow-sm"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-500 uppercase tracking-widest">
            © {currentYear} Pan Dashboard. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-[10px] font-black uppercase tracking-tighter text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
