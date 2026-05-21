import type { DashboardMenuKey, SidebarMenuItem } from '../../data/dashboardMockData';
import {
  Ticket,
  CalendarDays,
  CreditCard,
  Bell,
  User,
  LayoutDashboard,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  menuItems: SidebarMenuItem[];
  activeMenu: DashboardMenuKey;
  onChangeMenu: (key: DashboardMenuKey) => void;
  onLogout: () => void;
}

function getMenuIcon(key: DashboardMenuKey) {
  const className = 'h-[20px] w-[20px] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3';
  switch (key) {
    case 'events': return <CalendarDays className={className} />;
    case 'tickets': return <Ticket className={className} />;
    case 'payments': return <CreditCard className={className} />;
    case 'notifications': return <Bell className={className} />;
    case 'account': return <User className={className} />;
    default: return <LayoutDashboard className={className} />;
  }
}

export default function Sidebar({ menuItems, activeMenu, onChangeMenu, onLogout }: SidebarProps) {
  return (
    <aside className="sticky top-0 z-20 flex h-screen w-[270px] shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white/90 px-5 py-8 shadow-[10px_0_40px_rgba(15,23,42,0.06)] backdrop-blur-2xl transition-all">
      {/* Subtle glow effect behind sidebar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-orange-50 to-transparent" />

      <div className="relative mb-12 flex items-center gap-4 px-2">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-orange-500 via-red-500 to-violet-600 p-px shadow-[0_0_24px_rgba(249,115,22,0.35)] before:absolute before:inset-0 before:rounded-[14px] before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100">
          <div className="flex h-full w-full items-center justify-center rounded-[13px] bg-white/85 backdrop-blur-md">
            <Ticket className="h-6 w-6 text-orange-600" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-950">TicketRush</h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Dashboard</span>
        </div>
      </div>

      <nav className="relative flex-1 space-y-2">
        {menuItems.map(item => {
          const isActive = item.key === activeMenu;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChangeMenu(item.key)}
              className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-4 py-3.5 text-[15px] font-semibold transition-all duration-300 ${
                isActive
                  ? 'border border-orange-200 bg-orange-50 text-orange-700 shadow-sm'
                  : 'border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {isActive && (
                <div className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-orange-500 to-red-500" />
              )}
              <span className={`flex items-center justify-center ${isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-700'}`}>
                {getMenuIcon(item.key)}
              </span>
              <span className="tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="relative mt-6 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={onLogout}
          className="group flex w-full items-center gap-3.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-[15px] font-semibold text-red-600 transition-all duration-300 hover:border-red-200 hover:bg-red-100"
        >
          <LogOut className="h-[20px] w-[20px] transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="tracking-wide">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
