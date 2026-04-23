import { CalendarDays, CircleDollarSign, Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AddEventForm from '../components/admin/AddEventForm';
import { deleteAdminEvent, fetchAdminEvents, type AdminEvent } from '../../events/services/eventApi';
import {
  approvePayment,
  fetchPendingPaymentsForAdmin,
  rejectPayment,
  type PaymentOrder,
} from '../../order-payment/services/paymentService';

function formatDate(value: string): string {
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

function statusClass(status: AdminEvent['status']): string {
  if (status === 'ON_SALE') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'UPCOMING') {
    return 'border border-amber-200 bg-amber-50 text-amber-700';
  }
  return 'border border-slate-200 bg-slate-100 text-slate-700';
}

function statusLabel(status: AdminEvent['status']): string {
  if (status === 'ON_SALE') {
    return 'Đang mở bán';
  }
  if (status === 'UPCOMING') {
    return 'Sắp diễn ra';
  }
  return 'Đã kết thúc';
}

function progressClass(status: AdminEvent['status']): string {
  if (status === 'ON_SALE') {
    return 'bg-orange-500';
  }
  if (status === 'ENDED') {
    return 'bg-emerald-500';
  }
  return 'bg-slate-400';
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')} VND`;
}

function resolveSeatProgress(event: AdminEvent): { ratio: number; soldSeats: number; totalSeats: number; estimated: boolean } {
  const totalSeats = Math.max(0, event.totalSeatCount);
  const soldSeatCountRaw = (event as unknown as { soldSeatCount?: number }).soldSeatCount;

  if (typeof soldSeatCountRaw === 'number' && Number.isFinite(soldSeatCountRaw)) {
    const soldSeats = Math.min(totalSeats, Math.max(0, soldSeatCountRaw));
    const ratio = totalSeats > 0 ? Math.round((soldSeats / totalSeats) * 100) : 0;
    return { ratio, soldSeats, totalSeats, estimated: false };
  }

  const estimatedRatio = event.status === 'ENDED' ? 100 : event.status === 'ON_SALE' ? 35 : 0;
  const soldSeats = Math.round((estimatedRatio / 100) * totalSeats);
  return { ratio: estimatedRatio, soldSeats, totalSeats, estimated: true };
}

export default function AdminEventDashboard() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PaymentOrder[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState('');
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const soldThisMonth = events.reduce((sum, event) => {
      const progress = resolveSeatProgress(event);
      const saleDate = new Date(event.openSaleDate);
      const isCurrentMonth =
        !Number.isNaN(saleDate.getTime()) &&
        saleDate.getMonth() === currentMonth &&
        saleDate.getFullYear() === currentYear;
      return isCurrentMonth ? sum + progress.soldSeats : sum;
    }, 0);

    const projectedRevenue = events.reduce((sum, event) => {
      const eventRevenue = event.zones.reduce((zoneSum, zone) => zoneSum + Number(zone.price) * zone.seatCount, 0);
      return sum + eventRevenue;
    }, 0);

    const activeEvents = events.filter(event => event.status === 'ON_SALE').length;

    return {
      totalEvents: events.length,
      soldThisMonth,
      projectedRevenue,
      activeEvents,
    };
  }, [events]);

  const loadEvents = async (keyword?: string) => {
    try {
      setLoading(true);
      const data = await fetchAdminEvents(keyword);
      setEvents(data);
      setError('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể tải danh sách sự kiện');
      } else {
        setError('Không thể tải danh sách sự kiện');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    try {
      setLoadingPayments(true);
      const data = await fetchPendingPaymentsForAdmin();
      setPendingPayments(data);
      setPaymentError('');
    } catch (err) {
      if (err instanceof Error) {
        setPaymentError(err.message || 'Không thể tải danh sách thanh toán chờ duyệt');
      } else {
        setPaymentError('Không thể tải danh sách thanh toán chờ duyệt');
      }
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleApprovePayment = async (orderId: number) => {
    const note = window.prompt('Ghi chú duyệt (không bắt buộc):') || undefined;
    try {
      setProcessingPaymentId(orderId);
      await approvePayment(orderId, note);
      await loadPendingPayments();
    } catch (err) {
      if (err instanceof Error) {
        setPaymentError(err.message || 'Không thể duyệt thanh toán');
      } else {
        setPaymentError('Không thể duyệt thanh toán');
      }
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async (orderId: number) => {
    const note = window.prompt('Lý do từ chối (không bắt buộc):') || undefined;
    try {
      setProcessingPaymentId(orderId);
      await rejectPayment(orderId, note);
      await loadPendingPayments();
    } catch (err) {
      if (err instanceof Error) {
        setPaymentError(err.message || 'Không thể từ chối thanh toán');
      } else {
        setPaymentError('Không thể từ chối thanh toán');
      }
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadEvents(searchKeyword);
  };

  const handleDeleteEvent = async (event: AdminEvent) => {
    const confirmed = window.confirm(`Xóa sự kiện "${event.name}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingEventId(event.id);
      await deleteAdminEvent(event.id);
      await loadEvents(searchKeyword);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể xóa sự kiện');
      } else {
        setError('Không thể xóa sự kiện');
      }
    } finally {
      setDeletingEventId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] font-sans text-slate-800">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#0f172a]">Quản lý sự kiện</h1>
          <p className="mt-2 text-sm text-slate-500">Danh sách sự kiện đang lưu trong hệ thống TicketRush.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Thêm sự kiện mới
        </button>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <CalendarDays className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-500">Tổng sự kiện</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.totalEvents}</p>
        </article>

        <article className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <Ticket className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-500">Vé đã bán (tháng này)</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.soldThisMonth.toLocaleString('vi-VN')}</p>
        </article>

        <article className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-500">Doanh thu dự kiến</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatCurrency(stats.projectedRevenue)}</p>
        </article>

        <article className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700">
            <Ticket className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-500">Sự kiện đang bán</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.activeEvents}</p>
        </article>
      </section>

      <form onSubmit={handleSearchSubmit} className="mb-6 flex flex-wrap gap-3">
        <input
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          placeholder="Tìm theo tên sự kiện, địa điểm, mô tả..."
          className="min-w-[280px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-orange-400"
        />
        <button
          type="submit"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
        >
          Tìm kiếm
        </button>
        <button
          type="button"
          onClick={async () => {
            setSearchKeyword('');
            await loadEvents();
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          Xóa lọc
        </button>
      </form>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Ảnh</th>
                <th className="px-4 py-3">Tên sự kiện</th>
                <th className="px-4 py-3">Địa điểm</th>
                <th className="px-4 py-3">Trạng thái ghế</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12">
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                      <svg viewBox="0 0 200 120" className="mb-4 h-24 w-36 text-slate-300 opacity-50" aria-hidden="true">
                        <rect x="16" y="24" width="168" height="82" rx="12" fill="currentColor" opacity="0.18" />
                        <rect x="32" y="40" width="56" height="10" rx="5" fill="currentColor" opacity="0.5" />
                        <rect x="32" y="58" width="136" height="8" rx="4" fill="currentColor" opacity="0.35" />
                        <rect x="32" y="74" width="110" height="8" rx="4" fill="currentColor" opacity="0.25" />
                        <circle cx="154" cy="45" r="9" fill="currentColor" opacity="0.45" />
                      </svg>
                      <p className="text-sm font-medium text-slate-700">Chưa có sự kiện nào trong hệ thống</p>
                      <p className="mt-1 text-xs text-slate-500">Tạo sự kiện đầu tiên để bắt đầu quản lý bán vé Flash Sale.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                      >
                        <Plus className="h-4 w-4" />
                        Tạo sự kiện ngay
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                events.map(event => {
                  const progress = resolveSeatProgress(event);

                  return (
                    <tr key={event.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-600">#{event.id}</td>
                      <td className="px-4 py-3">
                        <img src={event.thumbnailUrl} alt={event.name} className="h-[60px] w-[40px] rounded-md object-cover" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{event.name}</p>
                        <p className="line-clamp-1 text-xs text-slate-500">{event.description}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{event.location}</td>
                      <td className="px-4 py-3">
                        <div className="w-[210px]">
                          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                            <span>{progress.soldSeats}/{progress.totalSeats} ghế</span>
                            <span>{progress.ratio}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200">
                            <div className={`h-2 rounded-full transition-all ${progressClass(event.status)}`} style={{ width: `${progress.ratio}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {progress.estimated ? 'Ước tính theo trạng thái sự kiện' : 'Dựa trên dữ liệu bán thực tế'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>Mở bán: {formatDate(event.openSaleDate)}</p>
                        <p className="text-xs text-slate-500">Diễn ra: {formatDate(event.eventStartDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(event.status)}`}>
                          {statusLabel(event.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingEvent(event)}
                            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:border-orange-300 hover:text-orange-700"
                            title="Sửa sự kiện"
                            aria-label="Sửa sự kiện"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(event)}
                            disabled={deletingEventId === event.id}
                            className="rounded-lg border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                            title="Xóa sự kiện"
                            aria-label="Xóa sự kiện"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-2xl">
            <AddEventForm
              onCancel={() => setIsAddModalOpen(false)}
              onCreated={async () => {
                setIsAddModalOpen(false);
                await loadEvents(searchKeyword);
              }}
            />
          </div>
        </div>
      )}

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-2xl">
            <AddEventForm
              initialEvent={editingEvent}
              onCancel={() => setEditingEvent(null)}
              onCreated={async () => {
                setEditingEvent(null);
                await loadEvents(searchKeyword);
              }}
            />
          </div>
        </div>
      )}

      <section className="mt-10 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Duyệt thanh toán</h2>
            <p className="mt-1 text-sm text-slate-500">Danh sách đơn hàng người dùng đã gửi thanh toán và đang chờ admin xác nhận.</p>
          </div>
          <button
            type="button"
            onClick={loadPendingPayments}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
          >
            Làm mới
          </button>
        </div>

        {paymentError && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{paymentError}</p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="px-4 py-3">Đơn hàng</th>
                <th className="px-4 py-3">Người mua</th>
                <th className="px-4 py-3">Sự kiện</th>
                <th className="px-4 py-3">Ghế</th>
                <th className="px-4 py-3">Ảnh chuyển khoản</th>
                <th className="px-4 py-3">Tổng tiền</th>
                <th className="px-4 py-3">Thời gian gửi</th>
                <th className="px-4 py-3">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {loadingPayments ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Đang tải danh sách chờ duyệt...
                  </td>
                </tr>
              ) : pendingPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Không có đơn hàng nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                pendingPayments.map(order => (
                  <tr key={order.orderId} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">#{order.orderId}</td>
                    <td className="px-4 py-3 text-slate-600">{order.username}</td>
                    <td className="px-4 py-3 text-slate-600">{order.eventName}</td>
                    <td className="px-4 py-3 text-slate-600">{order.seatCodes.join(', ')}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.paymentProofImageUrl ? (
                        <a href={order.paymentProofImageUrl} target="_blank" rel="noreferrer" className="inline-block">
                          <img
                            src={order.paymentProofImageUrl}
                            alt={`Minh chứng chuyển khoản đơn #${order.orderId}`}
                            className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                          />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{order.paymentRequestedAt ? formatDate(order.paymentRequestedAt) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingPaymentId === order.orderId}
                          onClick={() => handleApprovePayment(order.orderId)}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={processingPaymentId === order.orderId}
                          onClick={() => handleRejectPayment(order.orderId)}
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
