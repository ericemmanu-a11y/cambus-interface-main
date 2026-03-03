'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Camera, Truck, MonitorPlay, ShieldAlert } from 'lucide-react';

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  if (pathname === '/login' || pathname.startsWith('/simulador')) return null;

  const links = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'operador'] },
    { name: 'Cámaras', href: '/camaras', icon: Camera, roles: ['admin', 'supervisor', 'operador'] },
    { name: 'Vehículos', href: '/vehiculos', icon: Truck, roles: ['admin', 'supervisor'] },
    { name: 'Incidencias', href: '/incidencias', icon: ShieldAlert, roles: ['admin', 'supervisor', 'operador'] },
    { name: 'Configuración', href: '/configuracion', icon: MonitorPlay, roles: ['admin', 'supervisor'] },

  ];

  const allowedLinks = user ? links.filter(l => l.roles.includes(user.rol)) : [];

  return (
    <aside className="w-64 border-r border-slate-800/60 bg-slate-900/40 flex flex-col backdrop-blur-xl">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-800/60 pb-5">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-[0_0_15px_rgba(59,130,246,0.15)] flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="CamBus Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 font-sans">CamBus</h2>
        </div>
        {user && <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider border border-slate-700">{user.rol}</span>}
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-4">
        {allowedLinks.map(link => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm ${isActive ? 'bg-blue-500/10 text-blue-400 shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
              <Icon className="w-5 h-5" />
              {link.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-slate-800/60">
        <p className="text-xs text-slate-500 text-center">CamBus V2.0 &copy; 2026</p>
      </div>
    </aside>
  );
}
