import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '../../auth/utils/authStorage';
import { getMyProfile, updateMyProfile, uploadMyAvatar } from '../services/userProfileService';
import { heartbeatVirtualQueue } from '../../events/services/virtualQueueService';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader, { type AppNotification } from '../components/dashboard/DashboardHeader';
import MyTicketsSection from '../components/dashboard/MyTicketsSection';
import AccountProfilePanel from '../components/dashboard/AccountProfilePanel';
import EventExplorerSection from '../components/dashboard/EventExplorerSection';
import SupportHub from '../../support/components/SupportHub';
import NotificationSettingsPanel from '../components/dashboard/NotificationSettingsPanel';
import { getNotificationPreferences } from '../services/notificationPreferenceService';
import {
  sidebarMenuItems,
  userMock,
  type TicketItem,
  type DashboardMenuKey,
} from '../data/dashboardMockData';
import { getPublicEventDetail, searchPublicEvents } from '../../events/services/eventService';
import { fetchMyPayments, releaseHeldSeatsForPayment, type PaymentOrder } from '../../order-payment/services/paymentService';
import {
  getPendingReservations,
  removePendingReservation,
  type PendingReservation,
} from '../../order-payment/services/pendingReservationService';
import {
  getQueueAdmittedUntilFromSession,
  getQueueTokenFromSession,
  listQueueEventIdsInSession,
  setQueueAdmittedUntilInSession,
} from '../../events/utils/queueSessionStorage';

const PROFILE_HEARTBEAT_INTERVAL_MS = 30000;

const PAYMENT_STATUS_NOTICE_STORAGE_KEY = 'ticketrush.paymentNotice.dismissedOrderIds';
const DISMISSED_NOTIFICATIONS_KEY = 'ticketrush.notifications.dismissedIds';

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

function formatPaymentStatusLabel(order: PaymentOrder): string {
  if (order.paymentStatus === 'APPROVED') {
    return 'Đã duyệt';
  }
  if (order.paymentStatus === 'REJECTED') {
    return 'Bị từ chối';
  }
  if (order.paymentStatus === 'PENDING_REVIEW') {
    return 'Chờ duyệt';
  }
  return order.orderStatus === 'FAILED' ? 'Thất bại' : 'Chưa thanh toán';
}

function paymentStatusClass(order: PaymentOrder): string {
  if (order.paymentStatus === 'APPROVED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (order.paymentStatus === 'REJECTED') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }
  if (order.paymentStatus === 'PENDING_REVIEW') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-gray-700 bg-gray-800/70 text-gray-300';
}

function readDismissedRejectedOrderIds(): number[] {
  try {
    const raw = sessionStorage.getItem(PAYMENT_STATUS_NOTICE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) ? parsed.filter(value => Number.isFinite(value)) : [];
  } catch {
    return [];
  }
}

function writeDismissedRejectedOrderIds(orderIds: number[]): void {
  sessionStorage.setItem(PAYMENT_STATUS_NOTICE_STORAGE_KEY, JSON.stringify(orderIds));
}

function mapApprovedPaymentsToTickets(
  payments: PaymentOrder[],
  eventInfoById: Map<number, { date: string; location: string }>,
  buyerEmail?: string,
  buyerPhone?: string
): TicketItem[] {
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
      buyerEmail,
      buyerPhone,
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
  const [queueEventId, setQueueEventId] = useState<number | null>(null);
  const [queueReturnPath, setQueueReturnPath] = useState('');
  const [queueSlotSecondsLeft, setQueueSlotSecondsLeft] = useState<number | null>(null);
  const [eventsSearchKeyword, setEventsSearchKeyword] = useState('');
  const [eventsSearchSubmitToken, setEventsSearchSubmitToken] = useState(0);
  const [ticketsData, setTicketsData] = useState<TicketItem[]>([]);
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [unreadRejectedOrderIds, setUnreadRejectedOrderIds] = useState<number[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [systemNotificationEnabled, setSystemNotificationEnabled] = useState(true);

  const [username, setUsername] = useState(getAuthSession().username || 'User');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const state = (location.state as {
      activeMenu?: DashboardMenuKey;
      queueEventId?: number;
      returnToBookingPath?: string;
    } | null);

    const nextMenu = state?.activeMenu;
    if (nextMenu) {
      setActiveMenu(nextMenu);
      window.history.replaceState({}, document.title);
    }

    if (state?.queueEventId && Number.isFinite(state.queueEventId)) {
      setQueueEventId(state.queueEventId);
    } else {
      const availableQueueEvents = listQueueEventIdsInSession();
      setQueueEventId(availableQueueEvents.length > 0 ? availableQueueEvents[0] : null);
    }

    setQueueReturnPath(state?.returnToBookingPath || '');
  }, [location.state]);

  useEffect(() => {
    if (activeMenu !== 'account' || !queueEventId || !Number.isFinite(queueEventId)) {
      setQueueSlotSecondsLeft(null);
      return;
    }

    const queueToken = getQueueTokenFromSession(queueEventId);
    if (!queueToken) {
      setQueueSlotSecondsLeft(null);
      return;
    }

    const refreshCountdown = () => {
      const admittedUntil = getQueueAdmittedUntilFromSession(queueEventId);
      if (!admittedUntil || admittedUntil <= Date.now()) {
        setQueueSlotSecondsLeft(null);
        return;
      }

      setQueueSlotSecondsLeft(Math.max(0, Math.ceil((admittedUntil - Date.now()) / 1000)));
    };

    const beat = () => {
      void heartbeatVirtualQueue(queueEventId, queueToken)
        .then(status => {
          setQueueAdmittedUntilInSession(queueEventId, status.admittedUntilEpochMs ?? null);
          refreshCountdown();
        })
        .catch(() => {
          setQueueSlotSecondsLeft(null);
        });
    };

    refreshCountdown();
    beat();

    const heartbeatTimer = window.setInterval(beat, PROFILE_HEARTBEAT_INTERVAL_MS);
    const countdownTimer = window.setInterval(refreshCountdown, 1000);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(countdownTimer);
    };
  }, [activeMenu, queueEventId]);

  useEffect(() => {
    setPendingReservations(getPendingReservations());
  }, [activeMenu]);

  useEffect(() => {
    const loadMyPayments = async () => {
      try {
        const orders = await fetchMyPayments();
        setPaymentOrders(orders);

        const dismissedRejectedOrderIds = new Set(readDismissedRejectedOrderIds());
        const nextUnreadRejectedOrderIds = orders
          .filter(order => order.paymentStatus === 'REJECTED' && !dismissedRejectedOrderIds.has(order.orderId))
          .map(order => order.orderId);
        setUnreadRejectedOrderIds(nextUnreadRejectedOrderIds);

        // Generate unified notifications
        try {
          const dismissedNotificationIds = new Set(JSON.parse(localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]'));
          const newNotifications: AppNotification[] = [];

          orders.forEach(o => {
            if (o.paymentStatus === 'REJECTED') {
              const id = `rej-${o.orderId}`;
              newNotifications.push({
                id,
                title: 'Thanh toán bị từ chối',
                message: `Đơn đặt vé sự kiện ${o.eventName} đã bị từ chối.`,
                isRead: dismissedNotificationIds.has(id),
                date: new Date(o.paymentReviewedAt || o.createdAt),
                type: 'warning'
              });
            } else if (o.paymentStatus === 'APPROVED') {
              const id = `app-${o.orderId}`;
              newNotifications.push({
                id,
                title: 'Đặt vé thành công',
                message: `Tuyệt vời! Vé sự kiện ${o.eventName} của bạn đã sẵn sàng.`,
                isRead: dismissedNotificationIds.has(id),
                date: new Date(o.paymentReviewedAt || o.createdAt),
                type: 'success'
              });
            }
          });

          try {
            const events = await searchPublicEvents();
            events.forEach(e => {
              const id = `evt-${e.id}`;
              newNotifications.push({
                id,
                title: 'Sự kiện mới mở bán',
                message: `Sự kiện ${e.name} đang mở bán vé. Đừng bỏ lỡ!`,
                isRead: dismissedNotificationIds.has(id),
                date: new Date(e.openSaleDate),
                type: 'info'
              });
            });
          } catch (e) {
            // Ignore event load error for notifications
          }

          newNotifications.sort((a, b) => b.date.getTime() - a.date.getTime());
          setNotifications(newNotifications);
        } catch (e) {
          // Ignore unified notification error
        }

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
        setTicketsData(mapApprovedPaymentsToTickets(orders, eventInfoById, email, phoneNumber));
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
        setTicketsData(prev =>
          prev.map(ticket => ({
            ...ticket,
            buyerEmail: data.email || undefined,
            buyerPhone: data.phoneNumber || undefined,
          }))
        );
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

    const fetchNotificationPrefs = async () => {
      try {
        const prefs = await getNotificationPreferences();
        setSystemNotificationEnabled(prefs.systemNotificationEnabled);
      } catch {
        // Keep default true if API fails
      }
    };

    void loadMyPayments();
    fetchProfile();
    void fetchNotificationPrefs();

    const pollingTimer = window.setInterval(() => {
      void loadMyPayments();
    }, 15000);

    return () => {
      window.clearInterval(pollingTimer);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/auth';
  };

  const rejectedOrders = paymentOrders
    .filter(order => order.paymentStatus === 'REJECTED')
    .sort((left, right) => new Date(right.paymentReviewedAt || right.createdAt).getTime() - new Date(left.paymentReviewedAt || left.createdAt).getTime());

  const paymentHistoryOrders = paymentOrders
    .filter(order => order.paymentStatus === 'PENDING_REVIEW' || order.paymentStatus === 'APPROVED' || order.paymentStatus === 'REJECTED')
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const dismissRejectedNotifications = () => {
    if (unreadRejectedOrderIds.length === 0) {
      return;
    }

    const nextDismissedOrderIds = Array.from(new Set([
      ...readDismissedRejectedOrderIds(),
      ...unreadRejectedOrderIds,
    ]));

    writeDismissedRejectedOrderIds(nextDismissedOrderIds);
    setUnreadRejectedOrderIds([]);
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
          queueSlotSecondsLeft={queueSlotSecondsLeft}
          onReturnToBooking={queueEventId
            ? () => navigate(queueReturnPath || `/user/events/${queueEventId}/booking`)
            : undefined}
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

          {rejectedOrders.length > 0 && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-red-200">Có {rejectedOrders.length} đơn thanh toán đã bị từ chối.</p>
                  <p className="mt-1 text-sm text-red-100/85">
                    Vui lòng kiểm tra lý do từ chối bên dưới để gửi lại minh chứng hoặc liên hệ hỗ trợ.
                  </p>
                </div>
                {unreadRejectedOrderIds.length > 0 && (
                  <button
                    type="button"
                    onClick={dismissRejectedNotifications}
                    className="rounded-full border border-red-400/35 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/10"
                  >
                    Đã xem thông báo
                  </button>
                )}
              </div>
            </div>
          )}

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
                          navigate(
                            `/user/events/${item.eventId}/booking/payment`,
                            {
                              state: {
                                seatIds: item.seatIds,
                                reservationId: item.id,
                                queueToken: getQueueTokenFromSession(item.eventId) || undefined,
                              },
                            }
                          );
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

          <div className="mt-6">
            <h3 className="mb-3 text-xl font-bold text-white">Lịch sử thanh toán</h3>

            {paymentHistoryOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 px-4 py-8 text-center text-sm text-gray-300">
                Chưa có giao dịch thanh toán nào được gửi lên hệ thống.
              </div>
            ) : (
              <div className="grid gap-4">
                {paymentHistoryOrders.map(order => (
                  <article key={order.orderId} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500">Đơn thanh toán #{order.orderId}</p>
                        <h4 className="mt-1 text-lg font-semibold text-white">{order.eventName}</h4>
                        <p className="mt-1 text-sm text-gray-300">Ghế: {order.seatCodes.join(', ') || 'Đang cập nhật'}</p>
                        <p className="mt-1 text-sm text-emerald-300">Tổng tiền: {order.totalAmount.toLocaleString('vi-VN')}đ</p>
                      </div>

                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClass(order)}`}>
                        {formatPaymentStatusLabel(order)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-gray-300 md:grid-cols-2">
                      <p>Gửi lúc: <span className="font-medium text-white">{formatTicketDate(order.paymentRequestedAt || order.createdAt)}</span></p>
                      <p>Phản hồi lúc: <span className="font-medium text-white">{formatTicketDate(order.paymentReviewedAt)}</span></p>
                    </div>

                    {order.paymentStatus === 'REJECTED' ? (
                      <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        <p className="font-semibold">Thanh toán bị từ chối.</p>
                        <p className="mt-1">
                          {order.paymentNote?.trim()
                            ? `Lý do từ admin: ${order.paymentNote}`
                            : 'Admin chưa để lại ghi chú. Bạn có thể liên hệ hỗ trợ hoặc thanh toán lại với minh chứng rõ hơn.'}
                        </p>
                      </div>
                    ) : null}

                    {order.paymentStatus === 'PENDING_REVIEW' ? (
                      <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                        Đơn của bạn đã được gửi và đang chờ admin duyệt.
                      </div>
                    ) : null}

                    {order.paymentStatus === 'APPROVED' ? (
                      <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                        Thanh toán đã được duyệt. Vé của bạn đã sẵn sàng trong mục Vé của tôi.
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }

    if (activeMenu === 'support') {
      return <SupportHub mode="dashboard" />;
    }

    if (activeMenu === 'notifications') {
      return <NotificationSettingsPanel />;
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
          notificationCount={systemNotificationEnabled ? notifications.filter(n => !n.isRead).length : 0}
          notifications={systemNotificationEnabled ? notifications : []}
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
          onOpenNotifications={() => {
            setActiveMenu('notifications');
            setError('');
            setSuccess('');
          }}
          onNotificationClick={(notification) => {
             if (!notification.isRead) {
               try {
                 const dismissedNotificationIds = JSON.parse(localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]');
                 if (!dismissedNotificationIds.includes(notification.id)) {
                   dismissedNotificationIds.push(notification.id);
                   localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(dismissedNotificationIds));
                 }
                 setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
               } catch (e) {}
             }
             if (notification.id.startsWith('app-') || notification.id.startsWith('rej-')) {
                setActiveMenu('payments');
             } else if (notification.id.startsWith('evt-')) {
                setActiveMenu('events');
             }
          }}
          onLogout={handleLogout}
        />

        {activeMenu !== 'account' && activeMenu !== 'events' && activeMenu !== 'tickets' && activeMenu !== 'payments' && activeMenu !== 'support' && activeMenu !== 'notifications' && (
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

        {(activeMenu === 'account' || activeMenu === 'events' || activeMenu === 'tickets' || activeMenu === 'payments' || activeMenu === 'support' || activeMenu === 'notifications') &&
          renderMainContent()}
      </main>
    </div>
  );
}
