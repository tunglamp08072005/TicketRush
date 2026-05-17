import { Outlet, useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../features/auth/utils/authStorage';
import Sidebar from '../features/user/components/dashboard/Sidebar';
import { sidebarMenuItems, type DashboardMenuKey } from '../features/user/data/dashboardMockData';
import './UserEventLayout.css';

export default function UserEventLayout() {
  const navigate = useNavigate();

  const handleChangeMenu = (menuKey: DashboardMenuKey) => {
    navigate('/user', {
      state: {
        activeMenu: menuKey,
      },
    });
  };

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/auth';
  };

  return (
    <div className="user-event-shell relative flex min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-[#0a0612] to-gray-950 font-['Inter'] text-white">
      <div className="animated-bg" />
      <Sidebar
        menuItems={sidebarMenuItems}
        activeMenu="events"
        onChangeMenu={handleChangeMenu}
        onLogout={handleLogout}
      />

      <main className="user-event-content relative flex-1 overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
