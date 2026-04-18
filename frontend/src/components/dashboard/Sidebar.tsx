import type { DashboardMenuKey, SidebarMenuItem } from '../../data/dashboardMockData';

interface SidebarProps {
  menuItems: SidebarMenuItem[];
  activeMenu: DashboardMenuKey;
  onChangeMenu: (key: DashboardMenuKey) => void;
  memberTier: string;
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5V9a2 2 0 1 0 0 4v1.5A2.5 2.5 0 0 1 16.5 17h-9A2.5 2.5 0 0 1 5 14.5V13a2 2 0 1 0 0-4V7.5Z" />
      <path d="M12 5v12" strokeDasharray="2.4 2.4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="m12 2 2.9 5.88L21.4 9l-4.7 4.59L17.8 20 12 16.94 6.2 20l1.1-6.41L2.6 9l6.5-1.12L12 2Z" />
    </svg>
  );
}

function getMenuIcon(key: DashboardMenuKey) {
  const baseClass = 'h-[18px] w-[18px]';

  switch (key) {
    case 'home':
      return (
        <svg viewBox="0 0 24 24" className={baseClass} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 10.8 12 4l9 6.8V20a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.2Z" />
        </svg>
      );
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

export default function Sidebar({ menuItems, activeMenu, onChangeMenu, memberTier }: SidebarProps) {
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

      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-3.5">
        <div className="flex items-center gap-3">
          <img
            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80"
            alt="User avatar"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-orange-500/50"
          />
          <div>
            <p className="text-sm font-semibold text-white">Nguoi dung VIP</p>
            <p className="flex items-center gap-1 text-xs text-yellow-300">
              <StarIcon />
              {memberTier}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
