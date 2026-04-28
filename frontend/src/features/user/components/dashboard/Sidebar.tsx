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
    <aside className="relative flex h-screen w-[270px] shrink-0 flex-col overflow-hidden border-r border-white/5 bg-[#0a0a0c]/80 backdrop-blur-2xl px-5 py-8 transition-all">
      {/* Subtle glow effect behind sidebar */}
      <div className="absolute -left-24 -top-24 h-48 w-48 rounded-full bg-orange-500/20 blur-[90px] pointer-events-none" />

      <div className="relative mb-12 flex items-center gap-4 px-2">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-orange-500 via-red-500 to-violet-600 p-px shadow-[0_0_24px_rgba(249,115,22,0.35)] before:absolute before:inset-0 before:rounded-[14px] before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100">
          <div className="flex h-full w-full items-center justify-center rounded-[13px] bg-[#0a0a0c]/60 backdrop-blur-md">
            <Ticket className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex flex-col">
          <h1 className="bg-gradient-to-br from-white to-gray-400 bg-clip-text text-[22px] font-extrabold tracking-tight text-transparent">TicketRush</h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Dashboard</span>
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
                  ? 'bg-gradient-to-r from-orange-500/10 to-red-500/5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-orange-500/20'
                  : 'text-gray-400 border border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              {isActive && (
                <div className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-orange-500 to-red-500 shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
              )}
              <span className={`flex items-center justify-center ${isActive ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'text-gray-400 group-hover:text-gray-300'}`}>
                {getMenuIcon(item.key)}
              </span>
              <span className="tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="relative mt-6 border-t border-white/5 pt-6">
        <button
          type="button"
          onClick={onLogout}
          className="group flex w-full items-center gap-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-[15px] font-semibold text-red-400 transition-all duration-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]"
        >
          <LogOut className="h-[20px] w-[20px] transition-transform duration-300 group-hover:-translate-x-1" />
          <span className="tracking-wide">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
