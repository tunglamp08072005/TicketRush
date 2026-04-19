import { useEffect, useState } from 'react';
import { clearAuthSession, getAuthSession } from '../utils/authStorage';
import { getMyProfile, updateMyProfile } from '../services/userProfileService';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import HeroFlashSale from '../components/dashboard/HeroFlashSale';
import MyTicketsSection from '../components/dashboard/MyTicketsSection';
import AccountProfilePanel from '../components/dashboard/AccountProfilePanel';
import EventExplorerSection from '../components/dashboard/EventExplorerSection';
import {
  heroData,
  mapApiEventsToHeroData,
  mapApiEventsToTicketCards,
  myTicketsMock,
  sidebarMenuItems,
  userMock,
  type DashboardMenuKey,
} from '../data/dashboardMockData';
import { getFeaturedEvents } from '../services/eventService';

export default function UserDashboard() {
  const [activeMenu, setActiveMenu] = useState<DashboardMenuKey>('home');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [heroSectionData, setHeroSectionData] = useState(heroData);
  const [ticketsData, setTicketsData] = useState(myTicketsMock);

  const [username, setUsername] = useState(getAuthSession().username || 'User');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const loadFeaturedEvents = async () => {
      try {
        const events = await getFeaturedEvents();
        if (events.length > 0) {
          setHeroSectionData(mapApiEventsToHeroData(events));
          setTicketsData(mapApiEventsToTicketCards(events));
        }
        setEventsError('');
      } catch (err) {
        setHeroSectionData(heroData);
        setTicketsData(myTicketsMock);
        if (err instanceof Error) {
          setEventsError(err.message || 'Không thể tải sự kiện từ server');
        } else {
          setEventsError('Không thể tải sự kiện từ server');
        }
      }
    };

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getMyProfile();
        setUsername(data.username || 'User');
        setEmail(data.email || '');
        setProfile(data.profile || '');
        setAvatarUrl(data.avatarUrl || '');
        setPhoneNumber(data.phoneNumber || '');
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải hồ sơ');
        } else {
          setError('Không thể tải hồ sơ');
        }
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedEvents();
    fetchProfile();
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/auth';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (phoneNumber.trim() && !/^[0-9+\-()\s]{8,20}$/.test(phoneNumber.trim())) {
      setError('Số điện thoại không hợp lệ');
      setSuccess('');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateMyProfile({
        profile,
        avatarUrl,
        phoneNumber,
      });

      setUsername(updated.username || 'User');
      setEmail(updated.email || '');
      setProfile(updated.profile || '');
      setAvatarUrl(updated.avatarUrl || '');
      setPhoneNumber(updated.phoneNumber || '');
      setError('');
      setSuccess('Cập nhật hồ sơ thành công');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể cập nhật hồ sơ');
      } else {
        setError('Không thể cập nhật hồ sơ');
      }
      setSuccess('');
    } finally {
      setSaving(false);
    }
  };

  const renderMainContent = () => {
    if (activeMenu === 'account') {
      return (
        <AccountProfilePanel
          loading={loading}
          saving={saving}
          error={error}
          success={success}
          username={username}
          email={email}
          profile={profile}
          avatarUrl={avatarUrl}
          phoneNumber={phoneNumber}
          onAvatarUrlChange={setAvatarUrl}
          onPhoneNumberChange={setPhoneNumber}
          onProfileChange={setProfile}
          onSubmit={handleSaveProfile}
        />
      );
    }

    if (activeMenu === 'events') {
      return <EventExplorerSection />;
    }

    return (
      <>
        {eventsError && (
          <div className="mb-4 rounded-xl border border-yellow-500/35 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
            {eventsError}. Đang hiển thị dữ liệu demo.
          </div>
        )}
        <HeroFlashSale
          title={heroSectionData.title}
          subtitle={heroSectionData.subtitle}
          countdownLabel={heroSectionData.countdownLabel}
          countdown={heroSectionData.countdown}
          backgroundImage={heroSectionData.backgroundImage}
        />

        <MyTicketsSection tickets={ticketsData} />
      </>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-950 font-['Inter'] text-white">
      <Sidebar
        menuItems={sidebarMenuItems}
        activeMenu={activeMenu}
        onChangeMenu={menuKey => {
          setActiveMenu(menuKey);
          if (menuKey !== 'account') {
            setError('');
            setSuccess('');
          }
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <DashboardHeader
          displayName={userMock.displayName}
          notificationCount={0}
          onOpenProfile={() => {
            setActiveMenu('account');
            setError('');
            setSuccess('');
          }}
          onOpenOrders={() => {
            setActiveMenu('tickets');
            setError('');
            setSuccess('');
          }}
          onLogout={handleLogout}
        />

        {activeMenu !== 'home' && activeMenu !== 'account' && activeMenu !== 'events' && (
          <section className="mb-6 rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 p-8 text-center">
            <p className="text-lg font-semibold text-white">{sidebarMenuItems.find(item => item.key === activeMenu)?.label}</p>
            <p className="mt-2 text-sm text-gray-400">Tính năng đang được cập nhật. Bạn có thể chuyển sang Trang chủ hoặc Tài khoản.</p>
            <button
              type="button"
              onClick={() => {
                setActiveMenu('home');
                setError('');
                setSuccess('');
              }}
              className="mt-5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Quay lại Trang chủ
            </button>
          </section>
        )}

        {(activeMenu === 'home' || activeMenu === 'account' || activeMenu === 'events') && renderMainContent()}
      </main>
    </div>
  );
}
