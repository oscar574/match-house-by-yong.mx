import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, Calendar, User } from 'lucide-react';

const TABS = [
  { path: '/discover', label: 'Buscar', icon: Search },
  { path: '/favorites', label: 'Favoritos', icon: Heart },
  { path: '/visits', label: 'Visitas', icon: Calendar },
  { path: '/profile', label: 'Perfil', icon: User }
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-latitud-black/95 backdrop-blur-sm border-t border-white/10">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {TABS.map(t => {
          const active = location.pathname === t.path;
          const Icon = t.icon;
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              className="flex flex-col items-center justify-center gap-1 py-3"
            >
              <Icon size={20} className={active ? 'text-latitud-orange' : 'text-white/50'} />
              <span className={`text-[10px] font-medium ${active ? 'text-latitud-orange' : 'text-white/50'}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}