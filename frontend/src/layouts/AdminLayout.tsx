import { CalendarDays, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../utils/authStorage';

const navItems = [
  { to: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/admin/events', label: 'Quản lý sự kiện', icon: CalendarDays },
  { to: '/admin/users', label: 'Người dùng', icon: Users },
  { to: '/admin/settings', label: 'Cài đặt', icon: Settings },
];

function adminNavClass(isActive: boolean): string {
  return `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
    isActive
      ? 'border-l-4 border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
      : 'border-l-4 border-transparent text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
  }`;
}

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 md:h-screen md:flex-row md:overflow-hidden">
      <aside className="flex w-full flex-col border-b border-slate-200 bg-white shadow-sm md:w-72 md:border-b-0 md:border-r">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-lg font-bold tracking-wide text-orange-600">TICKETRUSH ADMIN</p>
          <p className="mt-1 text-xs text-slate-500">Bảng điều khiển</p>
        </div>

        <nav className="flex-1 px-3 py-3 md:px-4 md:py-5">
          <ul className="flex gap-2 overflow-x-auto md:block md:space-y-2">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <li key={item.to} className="min-w-max md:min-w-0">
                  <NavLink to={item.to} className={({ isActive }) => adminNavClass(isActive)}>
                    <Icon className="h-4 w-4 stroke-[1.75]" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-3 md:p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4 stroke-[1.75]" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-end border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
          <div className="h-9 w-9 rounded-full bg-slate-200 shadow-sm" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
