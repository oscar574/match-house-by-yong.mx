import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Building2, Calendar, ClipboardList, LogOut, Menu, X, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LatitudLogo from '@/components/LatitudLogo';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Clientes', path: '/admin/clients', icon: Users },
  { label: 'Inteligencia', path: '/admin/intelligence', icon: BarChart3 },
  { label: 'Propiedades', path: '/admin/properties', icon: Building2 },
  { label: 'Visitas', path: '/admin/visits', icon: Calendar },
  { label: 'Tareas', path: '/admin/tasks', icon: ClipboardList },
];

export default function AdminLayout() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-latitud-light">
      {/* Mobile header */}
      <div className="bg-latitud-black px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <LatitudLogo variant="white" size="sm" />
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white p-1">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 top-[52px] bg-latitud-black z-30 px-6 py-6">
          <nav className="space-y-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    active ? 'bg-latitud-orange text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <button
            onClick={() => base44.auth.logout('/')}
            className="flex items-center gap-3 px-4 py-3 text-white/40 mt-8 hover:text-white/60"
          >
            <LogOut size={18} />
            <span className="text-sm">Cerrar sesión</span>
          </button>
        </div>
      )}

      {/* Bottom tab bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around py-2 z-30 md:hidden">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 py-1 px-2">
              <Icon size={18} className={active ? 'text-latitud-orange' : 'text-latitud-gray/50'} />
              <span className={`text-[10px] ${active ? 'text-latitud-orange font-medium' : 'text-latitud-gray/50'}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="pb-20 md:pb-4">
        <Outlet />
      </div>
    </div>
  );
}