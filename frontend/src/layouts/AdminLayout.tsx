import { CalendarDays, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../utils/authStorage';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/events', label: 'Quan ly Su kien', icon: CalendarDays },
  { to: '/admin/users', label: 'Nguoi dung', icon: Users },
  { to: '/admin/settings', label: 'Cai dat', icon: Settings },
];

function adminNavClass(isActive: boolean): string {
  return `group flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'border-l-4 border-red-600 bg-gray-800/30 text-red-500'
      : 'border-l-4 border-transparent text-gray-300 hover:bg-gray-800/50 hover:text-white'
  }`;
}

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b] text-white">
      <aside className="flex w-64 flex-col border-r border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-6 py-6">
          <p className="text-lg font-bold tracking-wide text-red-500">TICKETRUSH ADMIN</p>
          <p className="mt-1 text-xs text-gray-400">Control panel</p>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => adminNavClass(isActive)}>
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition hover:bg-gray-800/50 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span>Dang xuat</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-gray-800 px-6">
          <div className="h-9 w-9 rounded-full bg-gray-700" />
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
