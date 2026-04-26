import { AlertTriangle, CalendarClock, CreditCard, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchPendingPaymentsForAdmin, type PaymentOrder } from '../../order-payment/services/paymentService';
import { fetchAdminEvents, type AdminEvent } from '../../events/services/eventApi';
import { fetchAdminUsersOverview, type AdminUsersOverview } from '../../user/services/adminUserService';

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')} VND`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function resolveRuntimeStatus(event: AdminEvent): AdminEvent['status'] {
  const openSale = new Date(event.openSaleDate);
  const saleEnd = new Date(event.saleEndDate);
  const now = new Date();

  if (event.archived) {
    return 'ENDED';
  }
  if (Number.isNaN(openSale.getTime()) || Number.isNaN(saleEnd.getTime())) {
    return event.status;
  }
  if (now >= saleEnd) {
    return 'ENDED';
  }
  if (now >= openSale) {
    return 'ON_SALE';
  }
  return 'UPCOMING';
}

export default function AdminOverviewPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentOrder[]>([]);
  const [usersOverview, setUsersOverview] = useState<AdminUsersOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        const [eventData, paymentData, userData] = await Promise.all([
          fetchAdminEvents(),
          fetchPendingPaymentsForAdmin(),
          fetchAdminUsersOverview(),
        ]);

        setEvents(eventData);
        setPendingPayments(paymentData);
        setUsersOverview(userData);
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải tổng quan admin');
        } else {
          setError('Không thể tải tổng quan admin');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, []);

  const overviewStats = useMemo(() => {
    const activeEvents = events.filter(event => resolveRuntimeStatus(event) === 'ON_SALE').length;
    const upcomingEvents = events.filter(event => resolveRuntimeStatus(event) === 'UPCOMING').length;
    const totalRevenue = events.reduce((sum, event) => sum + (Number(event.soldRevenue) || 0), 0);
    const soldSeats = events.reduce((sum, event) => sum + (Number(event.soldSeatCount) || 0), 0);

    return {
      totalEvents: events.length,
      activeEvents,
      upcomingEvents,
      pendingPayments: pendingPayments.length,
      totalUsers: usersOverview?.totalUsers ?? 0,
      totalRevenue,
      soldSeats,
    };
  }, [events, pendingPayments, usersOverview]);

  const urgentPayments = pendingPayments.slice(0, 5);
  const topEvents = [...events]
    .sort((left, right) => (Number(right.soldRevenue) || 0) - (Number(left.soldRevenue) || 0))
    .slice(0, 5);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.2),_transparent_30%),linear-gradient(135deg,#ffffff_0%,#fff7ed_38%,#f8fafc_100%)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Tổng quan hệ thống</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Bảng điều phối TicketRush</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Theo dõi nhanh nhịp mở bán, doanh thu, thanh toán chờ duyệt và mức sẵn sàng của người dùng trên cùng một màn hình.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <CalendarClock className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-slate-500">Sự kiện đang bán</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{loading ? '...' : overviewStats.activeEvents}</p>
          <p className="mt-1 text-xs text-slate-400">{overviewStats.upcomingEvents} sự kiện sắp mở bán</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CreditCard className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-slate-500">Doanh thu đã ghi nhận</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{loading ? '...' : formatCurrency(overviewStats.totalRevenue)}</p>
          <p className="mt-1 text-xs text-slate-400">{overviewStats.soldSeats.toLocaleString('vi-VN')} ghế đã bán</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-slate-500">Người dùng trong hệ thống</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{loading ? '...' : overviewStats.totalUsers}</p>
          <p className="mt-1 text-xs text-slate-400">{overviewStats.totalEvents} sự kiện đã tạo</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm text-slate-500">Thanh toán chờ xử lý</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{loading ? '...' : overviewStats.pendingPayments}</p>
          <p className="mt-1 text-xs text-slate-400">Ưu tiên duyệt để tránh user chờ lâu</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sự kiện nổi bật theo doanh thu</h2>
              <p className="mt-1 text-sm text-slate-500">Nhìn nhanh event nào đang đóng góp doanh thu nhiều nhất.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {topEvents.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">Chưa có dữ liệu sự kiện để hiển thị.</p>
            ) : (
              topEvents.map(event => (
                <article key={event.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{event.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{event.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(Number(event.soldRevenue) || 0)}</p>
                    <p className="mt-1 text-sm text-slate-500">{(Number(event.soldSeatCount) || 0).toLocaleString('vi-VN')} ghế đã bán</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Đơn chờ admin duyệt</h2>
              <p className="mt-1 text-sm text-slate-500">Các giao dịch cần phản hồi sớm để tránh user bị chờ.</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {urgentPayments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">Hiện không có đơn nào đang chờ duyệt.</p>
            ) : (
              urgentPayments.map(order => (
                <article key={order.orderId} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">#{order.orderId} • {order.username}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.eventName}</p>
                      <p className="mt-1 text-sm text-slate-400">Ghế: {order.seatCodes.join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(order.totalAmount)}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.paymentRequestedAt ? formatDateTime(order.paymentRequestedAt) : '-'}</p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
