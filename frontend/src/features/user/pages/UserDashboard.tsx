import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '../../auth/utils/authStorage';
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '../services/userProfileService';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import MyTicketsSection from '../components/dashboard/MyTicketsSection';
import AccountProfilePanel from '../components/dashboard/AccountProfilePanel';
import EventExplorerSection from '../components/dashboard/EventExplorerSection';
import {
  sidebarMenuItems,
  userMock,
  type TicketItem,
  type DashboardMenuKey,
} from '../data/dashboardMockData';
import { getPublicEventDetail } from '../../events/services/eventService';
import { fetchMyPayments, releaseHeldSeatsForPayment, type PaymentOrder } from '../../order-payment/services/paymentService';
import {
  getPendingReservations,
  removePendingReservation,
  type PendingReservation,
} from '../../order-payment/services/pendingReservationService';

function formatTicketDate(value: string | null): string {
  if (!value) {
    return 'Chưa có thời gian';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} - ${hour}:${minute}`;
}

function inferTicketTier(seatCodes: string[]): string {
  const upperCodes = seatCodes.map(code => code.toUpperCase());
  if (upperCodes.some(code => code.includes('VIP'))) {
    return 'VIP';
  }
  if (upperCodes.some(code => code.startsWith('A') || code.startsWith('B'))) {
    return 'Standard';
  }
  return 'General Admission';
}

function mapApprovedPaymentsToTickets(payments: PaymentOrder[], eventInfoById: Map<number, { date: string; location: string }>): TicketItem[] {
  return payments
    .filter(order => order.paymentStatus === 'APPROVED' && order.orderStatus === 'SUCCESS')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map(order => ({
      id: `TR-${order.orderId}`,
      ticketCode: order.queueId,
      eventName: order.eventName,
      eventDate: formatTicketDate(eventInfoById.get(order.eventId)?.date ?? order.createdAt),
      venue: eventInfoById.get(order.eventId)?.location ?? 'Địa điểm đang cập nhật',
      seat: order.seatCodes.length > 0 ? `Ghế: ${order.seatCodes.join(', ')}` : 'Ghế: Đang cập nhật',
      ticketTier: inferTicketTier(order.seatCodes),
      buyerName: order.username,
      buyerEmail: 'Theo tài khoản đăng ký',
      buyerPhone: 'Theo hồ sơ người dùng',
      qrValue: `${order.queueId}|${order.eventId}|${order.seatCodes.join(',')}`,
      checkInInstruction: 'Vui lòng mở mã vé khi vào cổng và đến trước giờ diễn tối thiểu 30 phút.',
      terms: [
        'Không hoàn/hủy vé sau khi thanh toán được xác nhận.',
        'Không mang chất cấm, vật sắc nhọn hoặc đồ dễ cháy vào khu vực sự kiện.',
        'Nếu QR lỗi, nhân viên sẽ đối chiếu bằng mã vé.',
      ],
      progress: 100,
      visualType: 'barcode',
    }));
}

export default function UserDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<DashboardMenuKey>('events');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ticketsError, setTicketsError] = useState('');
  const [paymentsError, setPaymentsError] = useState('');
  const [eventsSearchKeyword, setEventsSearchKeyword] = useState('');
  const [eventsSearchSubmitToken, setEventsSearchSubmitToken] = useState(0);
  const [ticketsData, setTicketsData] = useState<TicketItem[]>([]);
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);

  const [username, setUsername] = useState(getAuthSession().username || 'User');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const nextMenu = (location.state as { activeMenu?: DashboardMenuKey } | null)?.activeMenu;
    if (nextMenu) {
      setActiveMenu(nextMenu);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    setPendingReservations(getPendingReservations());
  }, [activeMenu]);

  useEffect(() => {
    const loadMyTickets = async () => {
      try {
        const orders = await fetchMyPayments();
        const uniqueEventIds = [...new Set(orders.map(order => order.eventId))];
        const eventDetailPairs = await Promise.all(
          uniqueEventIds.map(async eventId => {
            try {
              const detail = await getPublicEventDetail(eventId);
              return [eventId, { date: detail.eventStartDate || detail.openSaleDate, location: detail.location }] as const;
            } catch {
              return [eventId, { date: '', location: '' }] as const;
            }
          })
        );

        const eventInfoById = new Map<number, { date: string; location: string }>(eventDetailPairs);
        setTicketsData(mapApprovedPaymentsToTickets(orders, eventInfoById));
        setTicketsError('');
      } catch (err) {
        setTicketsData([]);
        if (err instanceof Error) {
          setTicketsError(err.message || 'Không thể tải vé đã duyệt');
        } else {
          setTicketsError('Không thể tải vé đã duyệt');
        }
      }
    };

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getMyProfile();
        setUsername(data.username || 'User');
        setEmail(data.email || '');
        setFullName(data.profile || '');
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

    loadMyTickets();
    fetchProfile();
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/auth';
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên đầy đủ.');
      setSuccess('');
      return;
    }

    if (phoneNumber.trim() && !/^[0-9+\-()\s]{8,20}$/.test(phoneNumber.trim())) {
      setError('Số điện thoại không hợp lệ');
      setSuccess('');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Vui lòng nhập số điện thoại.');
      setSuccess('');
      return;
    }

    try {
      setSaving(true);

      if (avatarFile) {
        setAvatarUploading(true);
        const avatarUpdatedProfile = await uploadMyAvatar(avatarFile);
        setAvatarUrl(avatarUpdatedProfile.avatarUrl || '');
      }

      const updated = await updateMyProfile({
        profile: fullName,
        phoneNumber,
      });

      setUsername(updated.username || 'User');
      setEmail(updated.email || '');
      setFullName(updated.profile || '');
      setAvatarUrl(updated.avatarUrl || '');
      setAvatarFile(null);
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
      setAvatarUploading(false);
      setSaving(false);
    }
  };

  const renderMainContent = () => {
    if (activeMenu === 'account') {
      return (
        <AccountProfilePanel
          loading={loading}
          saving={saving}
          avatarUploading={avatarUploading}
          error={error}
          success={success}
          email={email}
          profile={fullName}
          avatarUrl={avatarUrl}
          selectedAvatarFileName={avatarFile?.name || ''}
          phoneNumber={phoneNumber}
          onAvatarFileChange={file => {
            setAvatarFile(file);
            setSuccess('');
            setError('');
          }}
          onPhoneNumberChange={setPhoneNumber}
          onProfileChange={setFullName}
          onSubmit={handleSaveProfile}
        />
      );
    }

    if (activeMenu === 'events') {
      return (
        <EventExplorerSection
          searchKeyword={eventsSearchKeyword}
          searchSubmitToken={eventsSearchSubmitToken}
        />
      );
    }

    if (activeMenu === 'tickets') {
      return (
        <>
          {ticketsError && (
            <div className="mb-4 rounded-xl border border-yellow-500/35 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
              {ticketsError}.
            </div>
          )}
          <MyTicketsSection tickets={ticketsData} />
        </>
      );
    }

    if (activeMenu === 'payments') {
      return (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Thanh toán ({pendingReservations.length} đơn giữ chỗ)</h2>
          </div>

          {paymentsError && (
            <div className="mb-4 rounded-xl border border-yellow-500/35 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-200">
              {paymentsError}
            </div>
          )}

          {pendingReservations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 px-4 py-8 text-center text-sm text-gray-300">
              Chưa có đơn giữ chỗ nào cần thanh toán.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingReservations.map(item => {
                const minutesLeft = Math.max(0, Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / 60000));

                return (
                  <article key={item.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500">Đơn giữ chỗ: {item.id}</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{item.eventName}</h3>
                    <p className="mt-1 text-sm text-gray-300">{item.eventLocation}</p>
                    <p className="mt-2 text-sm text-orange-300">Ghế: {item.seatCodes.join(', ')}</p>
                    <p className="text-sm text-emerald-300">Tổng tiền: {item.totalAmount.toLocaleString('vi-VN')}đ</p>
                    <p className={`mt-1 text-sm ${minutesLeft > 0 ? 'text-yellow-300' : 'text-red-300'}`}>
                      {minutesLeft > 0 ? `Còn ${minutesLeft} phút để thanh toán` : 'Đơn đã hết hạn'}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={minutesLeft <= 0}
                        onClick={() => {
                          navigate(`/events/${item.eventId}/booking/payment`, {
                            state: {
                              seatIds: item.seatIds,
                              reservationId: item.id,
                            },
                          });
                        }}
                        className="rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Thanh toán ngay
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await releaseHeldSeatsForPayment(item.eventId, item.seatIds);
                            setPaymentsError('');
                          } catch (err) {
                            if (err instanceof Error) {
                              setPaymentsError(err.message || 'Không thể xóa giữ ghế trên hệ thống.');
                            } else {
                              setPaymentsError('Không thể xóa giữ ghế trên hệ thống.');
                            }
                            return;
                          }

                          removePendingReservation(item.id);
                          setPendingReservations(getPendingReservations());
                        }}
                        className="rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-200"
                      >
                        Xóa đơn
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    return null;
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
          displayName={fullName.trim() || username || userMock.displayName}
          avatarUrl={avatarUrl}
          notificationCount={0}
          searchValue={eventsSearchKeyword}
          searchVariant={activeMenu === 'events' ? 'events' : 'default'}
          onSearchValueChange={setEventsSearchKeyword}
          onSearchSubmit={() => {
            if (activeMenu === 'events') {
              setEventsSearchSubmitToken(prev => prev + 1);
            }
          }}
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

        {activeMenu !== 'account' && activeMenu !== 'events' && activeMenu !== 'tickets' && activeMenu !== 'payments' && (
          <section className="mb-6 rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 p-8 text-center">
            <p className="text-lg font-semibold text-white">{sidebarMenuItems.find(item => item.key === activeMenu)?.label}</p>
            <p className="mt-2 text-sm text-gray-400">Tính năng đang được cập nhật. Bạn có thể chuyển sang Sự kiện hoặc Tài khoản.</p>
            <button
              type="button"
              onClick={() => {
                setActiveMenu('events');
                setError('');
                setSuccess('');
              }}
              className="mt-5 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Về mục Sự kiện
            </button>
          </section>
        )}

        {(activeMenu === 'account' || activeMenu === 'events' || activeMenu === 'tickets' || activeMenu === 'payments') &&
          renderMainContent()}
      </main>
    </div>
  );
}
