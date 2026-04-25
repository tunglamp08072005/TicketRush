import { CalendarDays, CircleDollarSign, Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AddEventForm from '../components/admin/AddEventForm';
import {
  deleteAdminEvent,
  fetchAdminEvents,
  updateAdminEvent,
  type AdminEvent,
  type CreateAdminEventPayload,
} from '../../events/services/eventApi';
import {
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
  const soldSeatCountRaw = event.soldSeatCount;

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
  const POLL_INTERVAL_MS = 5000;
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [updatingVisibilityEventId, setUpdatingVisibilityEventId] = useState<number | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const stats = useMemo(() => {
    const soldTotal = events.reduce((sum, event) => {
      const progress = resolveSeatProgress(event);
      return sum + progress.soldSeats;
    }, 0);

    const projectedRevenue = events.reduce((sum, event) => {
      const soldRevenue = Number(event.soldRevenue);
      return sum + (Number.isFinite(soldRevenue) ? soldRevenue : 0);
    }, 0);

    const activeEvents = events.filter(event => resolveRuntimeStatus(event) === 'ON_SALE').length;

    return {
      totalEvents: events.length,
      soldTotal,
      projectedRevenue,
      activeEvents,
    };
  }, [events]);

  const loadEvents = async (keyword?: string, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const data = await fetchAdminEvents(keyword);
      setEvents(data);
      setError('');
      setLastUpdatedAt(new Date());
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể tải danh sách sự kiện');
      } else {
        setError('Không thể tải danh sách sự kiện');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadEvents(searchKeyword, true);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [searchKeyword]);

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

  const toUpdatePayload = (event: AdminEvent, overrides?: Partial<CreateAdminEventPayload>): CreateAdminEventPayload => {
    // Legacy events may not have saleEndDate yet. Fallback keeps request valid.
    const fallbackSaleEndDate = event.saleEndDate && !Number.isNaN(new Date(event.saleEndDate).getTime())
      ? event.saleEndDate
      : event.eventStartDate;

    return {
      name: event.name,
      description: event.description,
      location: event.location,
      heroImageUrl: event.heroImageUrl,
      thumbnailUrl: event.thumbnailUrl,
      layoutMapUrl: event.layoutMapUrl,
      openSaleDate: event.openSaleDate,
      saleEndDate: fallbackSaleEndDate,
      eventStartDate: event.eventStartDate,
      seatHoldMinutes: event.seatHoldMinutes,
      status: event.status,
      publicVisible: event.publicVisible,
      archived: event.archived,
      zones: event.zones.map(zone => ({
        name: zone.name,
        price: Number(zone.price),
        rowCount: zone.rowCount,
        seatsPerRow: zone.seatsPerRow,
        colorHex: zone.colorHex,
        locationDescription: zone.locationDescription || undefined,
      })),
      ...overrides,
    };
  };

  const handleSetPublic = async (event: AdminEvent) => {
    if (event.publicVisible && !event.archived) {
      return;
    }

    try {
      setUpdatingVisibilityEventId(event.id);
      await updateAdminEvent(event.id, toUpdatePayload(event, { publicVisible: true, archived: false }));
      await loadEvents(searchKeyword, true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể chuyển sự kiện sang Public');
      } else {
        setError('Không thể chuyển sự kiện sang Public');
      }
    } finally {
      setUpdatingVisibilityEventId(null);
    }
  };

  const handleSetArchive = async (event: AdminEvent) => {
    if (event.archived) {
      return;
    }

    try {
      setUpdatingVisibilityEventId(event.id);
      await updateAdminEvent(event.id, toUpdatePayload(event, { archived: true, publicVisible: false }));
      await loadEvents(searchKeyword, true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể lưu trữ sự kiện');
      } else {
        setError('Không thể lưu trữ sự kiện');
      }
    } finally {
      setUpdatingVisibilityEventId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] font-sans text-slate-800">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#0f172a]">Quản lý sự kiện</h1>
          <p className="mt-2 text-sm text-slate-500">Danh sách sự kiện đang lưu trong hệ thống TicketRush.</p>
          <p className="mt-1 text-xs text-slate-400">
            {lastUpdatedAt
              ? `Đang cập nhật thời gian thực (mỗi ${POLL_INTERVAL_MS / 1000} giây) • Cập nhật lúc ${lastUpdatedAt.toLocaleTimeString('vi-VN')}`
              : `Đang cập nhật thời gian thực (mỗi ${POLL_INTERVAL_MS / 1000} giây)`}
          </p>
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
          <p className="text-sm text-slate-500">Vé đã bán</p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{stats.soldTotal.toLocaleString('vi-VN')}</p>
        </article>

        <article className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-500">Tổng doanh thu (đã đặt)</p>
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
                <th className="px-4 py-3">Doanh thu</th>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12">
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
                  const runtimeStatus = resolveRuntimeStatus(event);
                  const progress = resolveSeatProgress(event);
                  const isPublicActive = event.publicVisible && !event.archived;
                  const isArchiveActive = event.archived;

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
                            <div className={`h-2 rounded-full transition-all ${progressClass(runtimeStatus)}`} style={{ width: `${progress.ratio}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {progress.estimated ? 'Ước tính theo trạng thái sự kiện' : 'Dựa trên dữ liệu bán thực tế'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(Number(event.soldRevenue) || 0)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>Mở bán: {formatDate(event.openSaleDate)}</p>
                        <p className="text-xs text-slate-500">Ngừng bán: {formatDate(event.saleEndDate)}</p>
                        <p className="text-xs text-slate-500">Diễn ra: {formatDate(event.eventStartDate)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(runtimeStatus)}`}>
                          {statusLabel(runtimeStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSetPublic(event)}
                            disabled={updatingVisibilityEventId === event.id || isPublicActive}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                              isPublicActive
                                ? 'border border-slate-300 bg-slate-100 text-slate-500'
                                : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            } disabled:opacity-60`}
                            title="Đưa sự kiện lên Public"
                            aria-label="Đưa sự kiện lên Public"
                          >
                            Public
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSetArchive(event)}
                            disabled={updatingVisibilityEventId === event.id || isArchiveActive}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                              isArchiveActive
                                ? 'border border-slate-300 bg-slate-100 text-slate-500'
                                : 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            } disabled:opacity-60`}
                            title="Lưu trữ sự kiện"
                            aria-label="Lưu trữ sự kiện"
                          >
                            Archive
                          </button>
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

    </div>
  );
}
