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
import { fetchMyPayments, releaseHeldSeatsForPayment, submitRefundBankInfo, type PaymentOrder } from '../../order-payment/services/paymentService';
import {
  getPendingReservations,
  removePendingReservation,
  type PendingReservation,
} from '../../order-payment/services/pendingReservationService';
import {
  clearQueueTokenInSession,
  getQueueAdmittedUntilFromSession,
  getQueueTokenFromSession,
  listQueueEventIdsInSession,
  setQueueAdmittedUntilInSession,
} from '../../events/utils/queueSessionStorage';

const PROFILE_HEARTBEAT_INTERVAL_MS = 30000;

const PAYMENT_STATUS_NOTICE_STORAGE_KEY = 'ticketrush.paymentNotice.dismissedOrderIds';
const DISMISSED_NOTIFICATIONS_KEY = 'ticketrush.notifications.dismissedIds';

interface RefundBankFormState {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}

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
  if (order.paymentStatus === 'EXPIRED_PENDING_REFUND') {
    return 'Quá hạn duyệt - Chờ hoàn tiền';
  }
  if (order.paymentStatus === 'REFUNDED') {
    return 'Đã hoàn tiền';
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
  if (order.paymentStatus === 'EXPIRED_PENDING_REFUND') {
    return 'border-red-500/40 bg-red-600/15 text-red-200';
  }
  if (order.paymentStatus === 'REFUNDED') {
    return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
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
    .filter(order =>
      (order.paymentStatus === 'APPROVED' && order.orderStatus === 'SUCCESS')
      || order.paymentStatus === 'EXPIRED_PENDING_REFUND'
      || order.paymentStatus === 'REFUNDED'
    )
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map(order => ({
      id: `TR-${order.orderId}`,
      ticketCode: order.queueId,
      eventName: order.eventName,
      eventDate: formatTicketDate(eventInfoById.get(order.eventId)?.date ?? order.createdAt),
      eventDateIso: eventInfoById.get(order.eventId)?.date ?? order.createdAt,
      venue: eventInfoById.get(order.eventId)?.location ?? 'Địa điểm đang cập nhật',
      seat: order.seatCodes.length > 0 ? `Ghế: ${order.seatCodes.join(', ')}` : 'Ghế: Đang cập nhật',
      ticketTier: inferTicketTier(order.seatCodes),
      buyerName: order.username,
      buyerEmail,
      buyerPhone,
      refundAmount: order.paymentStatus === 'EXPIRED_PENDING_REFUND' || order.paymentStatus === 'REFUNDED'
        ? order.totalAmount
        : undefined,
      refundStatusMessage: order.paymentStatus === 'EXPIRED_PENDING_REFUND'
        ? `Rất tiếc, yêu cầu thanh toán của bạn không được xử lý kịp trước khi sự kiện diễn ra. TicketRush thành thật xin lỗi và đang tiến hành hoàn trả 100% số tiền ${order.totalAmount.toLocaleString('vi-VN')} VND về tài khoản của bạn.`
        : order.paymentStatus === 'REFUNDED'
          ? `Đơn hàng này đã được xác nhận hoàn tiền 100% số tiền ${order.totalAmount.toLocaleString('vi-VN')} VND.`
          : undefined,
      supportTitle: `Hỗ trợ hoàn tiền đơn hàng quá hạn duyệt #${order.queueId}`,
      supportContent: `Tôi cần hỗ trợ hoàn tiền cho đơn hàng quá hạn duyệt ${order.queueId}. Mã đơn nội bộ: TR-${order.orderId}. Sự kiện: ${order.eventName}. Số tiền: ${order.totalAmount.toLocaleString('vi-VN')} VND.`,
      qrValue: `${order.queueId}|${order.eventId}|${order.seatCodes.join(',')}`,
      checkInInstruction: 'Vui lòng mở mã vé khi vào cổng và đến trước giờ diễn tối thiểu 30 phút.',
      terms: [
        'Không hoàn/hủy vé sau khi thanh toán được xác nhận.',
        'Không mang chất cấm, vật sắc nhọn hoặc đồ dễ cháy vào khu vực sự kiện.',
        'Nếu QR lỗi, nhân viên sẽ đối chiếu bằng mã vé.',
      ],
      progress: 100,
      lifecycleStatus: order.paymentStatus === 'EXPIRED_PENDING_REFUND'
        ? 'cancelled'
        : order.paymentStatus === 'REFUNDED'
          ? 'used'
          : undefined,
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
  const [paymentsSuccess, setPaymentsSuccess] = useState('');
  const [queueEventId, setQueueEventId] = useState<number | null>(null);
  const [eventsSearchKeyword, setEventsSearchKeyword] = useState('');
  const [eventsSearchSubmitToken, setEventsSearchSubmitToken] = useState(0);
  const [ticketsData, setTicketsData] = useState<TicketItem[]>([]);
  const [pendingReservations, setPendingReservations] = useState<PendingReservation[]>([]);
  const [paymentOrders, setPaymentOrders] = useState<PaymentOrder[]>([]);
  const [unreadRejectedOrderIds, setUnreadRejectedOrderIds] = useState<number[]>([]);
  const [processingRefundBankOrderId, setProcessingRefundBankOrderId] = useState<number | null>(null);
  const [refundBankForms, setRefundBankForms] = useState<Record<number, RefundBankFormState>>({});
  const [activePaymentPanel, setActivePaymentPanel] = useState<'history' | 'refunds'>('history');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [systemNotificationEnabled, setSystemNotificationEnabled] = useState(true);

  const [username, setUsername] = useState(getAuthSession().username || 'User');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState(''); // Track original email for comparison
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [birthday, setBirthday] = useState('');
  const [loginProvider, setLoginProvider] = useState<string | undefined>(undefined);
  const activePendingReservation = pendingReservations[0] ?? null;
  const activeHoldSecondsLeft = activePendingReservation
    ? Math.max(0, Math.ceil((new Date(activePendingReservation.expiresAt).getTime() - Date.now()) / 1000))
    : null;

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
  }, [location.state]);

  useEffect(() => {
    if (!queueEventId || !Number.isFinite(queueEventId)) {
      return;
    }

    const queueToken = getQueueTokenFromSession(queueEventId);
    if (!queueToken) {
      return;
    }

    const refreshAdmission = () => {
      const admittedUntil = getQueueAdmittedUntilFromSession(queueEventId);
      if (!admittedUntil || admittedUntil <= Date.now()) {
        return;
      }
    };

    const beat = () => {
      void heartbeatVirtualQueue(queueEventId, queueToken)
        .then(status => {
          setQueueAdmittedUntilInSession(queueEventId, status.admittedUntilEpochMs ?? null);
          refreshAdmission();
        })
        .catch(() => {
          // Keep the dashboard usable; the booking page will re-validate the token.
        });
    };

    refreshAdmission();
    beat();

    const heartbeatTimer = window.setInterval(beat, PROFILE_HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(heartbeatTimer);
    };
  }, [queueEventId]);

  useEffect(() => {
    setPendingReservations(getPendingReservations());
  }, [activeMenu]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPendingReservations(getPendingReservations());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

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
        setOriginalEmail(data.email || ''); // Store original email for comparison
        setFullName(data.profile || '');
        setAvatarUrl(data.avatarUrl || '');
        setPhoneNumber(data.phoneNumber || '');
        setGender(data.gender || '');
        setBirthday(data.birthday || '');
        setLoginProvider(data.loginProvider);
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

  const refundOrders = paymentOrders
    .filter(order => order.paymentStatus === 'EXPIRED_PENDING_REFUND' || order.paymentStatus === 'REFUNDED')
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

    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Email không hợp lệ.');
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

      // Only include email in payload if:
      // 1. Not Google login (Google users can't change email)
      // 2. Email was actually changed by user
      const isGoogleLogin = loginProvider === 'GOOGLE';
      const emailChanged = email.trim() !== originalEmail.trim();
      const shouldUpdateEmail = !isGoogleLogin && emailChanged;

      const updatePayload = {
        ...(shouldUpdateEmail && { email: email.trim() }),
        profile: fullName,
        phoneNumber,
        gender,
        birthday,
      };

      const updated = await updateMyProfile(updatePayload);

      setUsername(updated.username || 'User');
      setEmail(updated.email || '');
      setOriginalEmail(updated.email || ''); // Update original email after successful save
      setFullName(updated.profile || '');
      setAvatarUrl(updated.avatarUrl || '');
      setAvatarFile(null);
      setPhoneNumber(updated.phoneNumber || '');
      setGender(updated.gender || '');
      setBirthday(updated.birthday || '');
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

  const getRefundBankForm = (order: PaymentOrder): RefundBankFormState => (
    refundBankForms[order.orderId] ?? {
      bankName: order.refundBankName ?? '',
      bankAccountNumber: order.refundBankAccountNumber ?? '',
      bankAccountHolder: order.refundBankAccountHolder ?? '',
    }
  );

  const updateRefundBankForm = (order: PaymentOrder, field: keyof RefundBankFormState, value: string) => {
    setRefundBankForms(current => ({
      ...current,
      [order.orderId]: {
        ...(current[order.orderId] ?? {
          bankName: order.refundBankName ?? '',
          bankAccountNumber: order.refundBankAccountNumber ?? '',
          bankAccountHolder: order.refundBankAccountHolder ?? '',
        }),
        [field]: value,
      },
    }));
    setPaymentsError('');
    setPaymentsSuccess('');
  };

  const handleSubmitRefundBankInfo = async (event: React.FormEvent, order: PaymentOrder) => {
    event.preventDefault();

    const form = getRefundBankForm(order);
    const bankName = form.bankName.trim();
    const bankAccountNumber = form.bankAccountNumber.trim();
    const bankAccountHolder = form.bankAccountHolder.trim();

    if (!bankName || !bankAccountNumber || !bankAccountHolder) {
      setPaymentsError('Vui lòng nhập đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản nhận hoàn tiền.');
      setPaymentsSuccess('');
      return;
    }

    try {
      setProcessingRefundBankOrderId(order.orderId);
      await submitRefundBankInfo(order.orderId, { bankName, bankAccountNumber, bankAccountHolder });
      const orders = await fetchMyPayments();
      setPaymentOrders(orders);
      setPaymentsError('');
      setPaymentsSuccess('Đã gửi thông tin nhận hoàn tiền. Admin sẽ xử lý trong thời gian sớm nhất.');
    } catch (err) {
      if (err instanceof Error) {
        setPaymentsError(err.message || 'Không thể gửi thông tin nhận hoàn tiền');
      } else {
        setPaymentsError('Không thể gửi thông tin nhận hoàn tiền');
      }
      setPaymentsSuccess('');
    } finally {
      setProcessingRefundBankOrderId(null);
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
          gender={gender}
          birthday={birthday}
          loginProvider={loginProvider}
          activeHoldSecondsLeft={activeHoldSecondsLeft}
          onOpenPayments={() => setActiveMenu('payments')}
          onAvatarFileChange={file => {
            setAvatarFile(file);
            setSuccess('');
            setError('');
          }}
          onEmailChange={value => {
            setEmail(value);
            setError('');
          }}
          onPhoneNumberChange={setPhoneNumber}
          onGenderChange={setGender}
          onBirthdayChange={setBirthday}
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
        <section className="user-soft-panel">
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

          {paymentsSuccess && (
            <div className="mb-4 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              {paymentsSuccess}
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
                  <article key={item.id} className="card-3d rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
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
                          const queueToken = getQueueTokenFromSession(item.eventId) || undefined;
                          try {
                            await releaseHeldSeatsForPayment(item.eventId, item.seatIds, queueToken);
                            setPaymentsError('');
                          } catch (err) {
                            if (err instanceof Error) {
                              setPaymentsError(err.message || 'Không thể xóa giữ ghế trên hệ thống.');
                            } else {
                              setPaymentsError('Không thể xóa giữ ghế trên hệ thống.');
                            }
                            return;
                          }

                          clearQueueTokenInSession(item.eventId);
                          removePendingReservation(item.id, { startCooldown: true });
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
            <div className="inline-flex max-w-full rounded-2xl border border-white/10 bg-white/5 p-1 shadow-inner backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setActivePaymentPanel('history')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activePaymentPanel === 'history'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Giao dịch ({paymentHistoryOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setActivePaymentPanel('refunds')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activePaymentPanel === 'refunds'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : refundOrders.length > 0
                      ? 'text-red-200 hover:bg-red-500/10 hover:text-red-100'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Hoàn tiền ({refundOrders.length})
              </button>
            </div>

            {activePaymentPanel === 'refunds' ? (
              <div className="mt-4">
                {refundOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 px-4 py-8 text-center text-sm text-gray-300">
                    Chưa có đơn nào cần hoàn tiền.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {refundOrders.map(order => {
                      const refundForm = getRefundBankForm(order);
                      const hasRefundBankInfo = Boolean(order.refundBankName && order.refundBankAccountNumber && order.refundBankAccountHolder);
                      const isRefunded = order.paymentStatus === 'REFUNDED';

                      return (
                        <article key={order.orderId} className="card-3d rounded-2xl border border-red-400/20 bg-red-500/10 p-4 backdrop-blur-xl">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.15em] text-red-200/70">Đơn hoàn tiền #{order.orderId}</p>
                              <h4 className="mt-1 text-lg font-semibold text-white">{order.eventName}</h4>
                              <p className="mt-1 text-sm text-red-100/85">Ghế: {order.seatCodes.join(', ') || 'Đang cập nhật'}</p>
                              <p className="mt-1 text-sm font-semibold text-red-100">Số tiền hoàn: {order.totalAmount.toLocaleString('vi-VN')}đ</p>
                            </div>

                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClass(order)}`}>
                              {formatPaymentStatusLabel(order)}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 text-sm text-red-100/85 md:grid-cols-2">
                            <p>Gửi lúc: <span className="font-medium text-white">{formatTicketDate(order.paymentRequestedAt || order.createdAt)}</span></p>
                            <p>Phản hồi lúc: <span className="font-medium text-white">{formatTicketDate(order.paymentReviewedAt)}</span></p>
                          </div>

                          <div className="mt-3 rounded-xl border border-red-300/20 bg-red-950/25 px-4 py-3 text-sm text-red-50">
                            {isRefunded ? (
                              <p>Đơn này đã được xác nhận hoàn tiền 100%.</p>
                            ) : (
                              <p>Đơn hàng quá hạn duyệt. Hệ thống sẽ hoàn tiền 100% sau khi nhận thông tin tài khoản từ bạn.</p>
                            )}

                            {hasRefundBankInfo ? (
                              <p className="mt-2 text-red-50/90">
                                Đã nhận thông tin tài khoản: {order.refundBankName} - {order.refundBankAccountNumber} ({order.refundBankAccountHolder}).
                              </p>
                            ) : !isRefunded ? (
                              <form onSubmit={event => void handleSubmitRefundBankInfo(event, order)} className="mt-4 grid gap-3 md:grid-cols-3">
                                <label className="block text-xs font-semibold text-red-50">
                                  Tên ngân hàng
                                  <input
                                    value={refundForm.bankName}
                                    onChange={event => updateRefundBankForm(order, 'bankName', event.target.value)}
                                    placeholder="Ví dụ: MB Bank"
                                    className="mt-1 w-full rounded-lg border border-red-200/30 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-300"
                                    disabled={processingRefundBankOrderId === order.orderId}
                                  />
                                </label>

                                <label className="block text-xs font-semibold text-red-50">
                                  Số tài khoản
                                  <input
                                    value={refundForm.bankAccountNumber}
                                    onChange={event => updateRefundBankForm(order, 'bankAccountNumber', event.target.value)}
                                    placeholder="Nhập số tài khoản"
                                    className="mt-1 w-full rounded-lg border border-red-200/30 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-300"
                                    disabled={processingRefundBankOrderId === order.orderId}
                                  />
                                </label>

                                <label className="block text-xs font-semibold text-red-50">
                                  Tên chủ tài khoản
                                  <input
                                    value={refundForm.bankAccountHolder}
                                    onChange={event => updateRefundBankForm(order, 'bankAccountHolder', event.target.value)}
                                    placeholder="Nhập đúng tên trên tài khoản"
                                    className="mt-1 w-full rounded-lg border border-red-200/30 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-red-300"
                                    disabled={processingRefundBankOrderId === order.orderId}
                                  />
                                </label>

                                <div className="md:col-span-3">
                                  <button
                                    type="submit"
                                    disabled={processingRefundBankOrderId === order.orderId}
                                    className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {processingRefundBankOrderId === order.orderId ? 'Đang gửi thông tin...' : 'Gửi thông tin nhận hoàn tiền'}
                                  </button>
                                </div>
                              </form>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4">
                {paymentHistoryOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 px-4 py-8 text-center text-sm text-gray-300">
                    Chưa có giao dịch thanh toán nào được gửi lên hệ thống.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {paymentHistoryOrders.map(order => (
                      <article key={order.orderId} className="card-3d rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
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
                            Đơn của bạn đã được gửi và đang chờ admin duyệt. Đơn của bạn sẽ được duyệt trong vòng 1h, nếu sau thời gian đó mà chưa được duyệt xin hãy liên lạc với chúng tôi qua mục hỗ trợ.
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
    <div className="user-dashboard-light relative flex h-screen min-h-screen overflow-hidden bg-[#f6f8fc] font-['Inter'] text-slate-900">
      {/* Animated Background Effects */}
      <div className="hidden" />
      <div className="hidden">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${5 + i * 8}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${18 + i % 5}s`,
            background: i % 3 === 0 ? 'rgba(124, 58, 237, 0.8)' : i % 3 === 1 ? 'rgba(236, 72, 153, 0.8)' : 'rgba(255, 107, 107, 0.8)',
            width: `${3 + (i % 3)}px`,
            height: `${3 + (i % 3)}px`
          }} />
        ))}
      </div>
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[linear-gradient(120deg,rgba(255,245,238,0.9),rgba(230,247,255,0.75),rgba(255,255,255,0))]" />
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

      <main className="relative h-screen flex-1 overflow-y-auto p-5 lg:p-8">
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
