import type { DashboardMenuKey, SidebarMenuItem } from '../../data/dashboardMockData';

interface SidebarProps {
  menuItems: SidebarMenuItem[];
  activeMenu: DashboardMenuKey;
  onChangeMenu: (key: DashboardMenuKey) => void;
  onLogout: () => void;
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5V9a2 2 0 1 0 0 4v1.5A2.5 2.5 0 0 1 16.5 17h-9A2.5 2.5 0 0 1 5 14.5V13a2 2 0 1 0 0-4V7.5Z" />
      <path d="M12 5v12" strokeDasharray="2.4 2.4" />
    </svg>
  );
}

function getMenuIcon(key: DashboardMenuKey) {
  const baseClass = 'h-[18px] w-[18px]';

  switch (key) {
    case 'events':
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case 'tickets':
      return <TicketIcon />;
    case 'payments':
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19" />
          <path d="M7 15h3" />
        </svg>
      );
    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 18H5.8c-.7 0-1.1-.8-.7-1.3l1.1-1.4a4 4 0 0 0 .8-2.5V10a5 5 0 0 1 10 0v2.8c0 .9.3 1.8.8 2.5l1.1 1.4c.4.5 0 1.3-.7 1.3H15Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'account':
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20a7 7 0 1 1 14 0" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v12" />
          <path d="M12 18.5h.01" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export default function Sidebar({ menuItems, activeMenu, onChangeMenu, onLogout }: SidebarProps) {
  return (
    <aside className="flex h-screen w-[250px] shrink-0 flex-col border-r border-gray-800 bg-gray-950 px-4 py-6">
      <div className="mb-10 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-400 text-white shadow-[0_0_20px_rgba(249,115,22,0.45)]">
          <TicketIcon />
        </span>
        <div>
          <p className="text-xl font-bold tracking-wide text-white">TicketRush</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Event Dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {menuItems.map(item => {
          const isActive = item.key === activeMenu;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChangeMenu(item.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white'
              }`}
            >
              {getMenuIcon(item.key)}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-gray-800 pt-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
