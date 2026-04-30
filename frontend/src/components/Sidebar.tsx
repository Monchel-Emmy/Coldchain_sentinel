import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Thermometer, Cpu, Bell,
  BrainCircuit, FileBarChart2, Users, ShieldCheck,
  Settings, X, Activity, Building2, Syringe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/',               label: 'Dashboard',         icon: LayoutDashboard, permission: 'dashboard:view' },
  { to: '/health-centers', label: 'Health Centers',    icon: Building2,       permission: 'health_centers:view' },
  { to: '/fridges',        label: 'Fridges & Freezers',icon: Thermometer,     permission: 'fridges:view' },
  { to: '/devices',        label: 'IoT Sensors',       icon: Cpu,             permission: 'devices:view' },
  { to: '/vaccines',       label: 'Vaccines',          icon: Syringe,         permission: 'vaccines:view' },
  { to: '/monitoring',     label: 'Live Monitoring',   icon: Activity,        permission: 'monitoring:view' },
  { to: '/alerts',         label: 'Alerts',            icon: Bell,            permission: 'alerts:view' },
  { to: '/predictions',    label: 'AI Predictions',    icon: BrainCircuit,    permission: 'predictions:view' },
  { to: '/reports',        label: 'Reports',           icon: FileBarChart2,   permission: 'reports:view' },
  { to: '/users',          label: 'Users',             icon: Users,           permission: 'users:view' },
  { to: '/roles',          label: 'Roles & Access',    icon: ShieldCheck,     permission: 'roles:view' },
  { to: '/settings',       label: 'Settings',          icon: Settings,        permission: 'settings:view' },
];

interface Props { open: boolean; onClose: () => void; }

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuth();
  const permissions = user?.role.permissions ?? [];

  const visibleNav = nav.filter(item => permissions.includes(item.permission));

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onClose} />}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-30 flex flex-col
        transform transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Thermometer size={18} />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">ColdChain Sentinel</p>
              <p className="text-xs text-slate-400">Cold Chain IoT</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 py-2.5 border-b border-slate-700/50">
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded-full font-medium">
              {user.role.name}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {visibleNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">v1.0.0 · ColdChain Sentinel</p>
        </div>
      </aside>
    </>
  );
}
