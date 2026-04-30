import { Menu, Bell, Wifi, WifiOff, LogOut, ChevronDown } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  onMenuClick: () => void;
  alertCount: number;
  connected: boolean;
}

export default function Header({ onMenuClick, alertCount, connected }: Props) {
  const { user, logout } = useAuth();
  const [time, setTime] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Open menu">
          <Menu size={20} />
        </button>
        <p className="hidden sm:block text-sm text-slate-500">
          {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${connected ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          {connected ? 'Live' : 'Offline'}
        </div>

        {/* Alerts bell */}
        <Link 
          to="/alerts" 
          className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600" 
          aria-label="Alerts"
        >
          <Bell size={20} />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>

        {/* User dropdown */}
        <div className="relative pl-3 border-l border-slate-200" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            className="flex items-center gap-2 hover:bg-slate-50 rounded-lg px-2 py-1.5 transition-colors"
          >
            {user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user?.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initials}</span>
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-tight">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role.name}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {user?.role.name}
                </span>
              </div>
              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
