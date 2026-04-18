import { useEffect, useState } from 'react';
import AddEventForm from '../components/admin/AddEventForm';
import { deleteAdminEvent, fetchAdminEvents, type AdminEvent } from '../services/eventApi';

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
    return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
  }
  if (status === 'UPCOMING') {
    return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40';
  }
  return 'bg-gray-700 text-gray-200 border border-gray-600';
}

export default function AdminEventDashboard() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  const loadEvents = async (keyword?: string) => {
    try {
      setLoading(true);
      const data = await fetchAdminEvents(keyword);
      setEvents(data);
      setError('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Khong the tai danh sach su kien');
      } else {
        setError('Khong the tai danh sach su kien');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadEvents(searchKeyword);
  };

  const handleDeleteEvent = async (event: AdminEvent) => {
    const confirmed = window.confirm(`Xoa su kien "${event.name}"? Hanh dong nay khong the hoan tac.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingEventId(event.id);
      await deleteAdminEvent(event.id);
      await loadEvents(searchKeyword);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Khong the xoa su kien');
      } else {
        setError('Khong the xoa su kien');
      }
    } finally {
      setDeletingEventId(null);
    }
  };

  return (
    <div className="text-gray-100">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Quan ly Su kien</h1>
          <p className="mt-1 text-sm text-gray-400">Danh sach su kien dang luu trong he thong TicketRush.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(239,68,68,0.25)] transition hover:brightness-110"
        >
          Them su kien moi
        </button>
      </header>

      <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-wrap gap-3">
        <input
          value={searchKeyword}
          onChange={e => setSearchKeyword(e.target.value)}
          placeholder="Tim theo ten su kien, dia diem, mo ta..."
          className="min-w-[280px] flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/60"
        />
        <button
          type="submit"
          className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-100 transition hover:border-orange-500/60"
        >
          Tim kiem
        </button>
        <button
          type="button"
          onClick={async () => {
            setSearchKeyword('');
            await loadEvents();
          }}
          className="rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-100 transition hover:border-gray-500"
        >
          Xoa loc
        </button>
      </form>

      {error && <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</p>}

      <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Anh</th>
                <th className="px-4 py-3">Ten su kien</th>
                <th className="px-4 py-3">Dia diem</th>
                <th className="px-4 py-3">So do ghe</th>
                <th className="px-4 py-3">Ngay mo ban</th>
                <th className="px-4 py-3">Trang thai</th>
                <th className="px-4 py-3">Tac vu</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Dang tai du lieu...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Chua co su kien nao. Hay tao su kien moi.
                  </td>
                </tr>
              ) : (
                events.map(event => (
                  <tr key={event.id} className="border-t border-gray-800 hover:bg-gray-900/90">
                    <td className="px-4 py-3 font-medium text-gray-300">#{event.id}</td>
                    <td className="px-4 py-3">
                      <img src={event.thumbnailUrl} alt={event.name} className="h-14 w-24 rounded-lg object-cover" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{event.name}</p>
                      <p className="line-clamp-1 text-xs text-gray-400">{event.description}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{event.location}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{event.totalSeatCount} ghe</p>
                        <div className="flex flex-wrap gap-2">
                          {event.zones.map(zone => (
                            <div key={zone.id} className="rounded-xl border border-gray-700 bg-gray-950/80 px-2.5 py-2 text-xs text-gray-200">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zone.colorHex }} />
                                <span className="font-semibold text-white">{zone.name}</span>
                              </div>
                              <p className="mt-1 text-gray-400">
                                {zone.rowCount} x {zone.seatsPerRow} | {Number(zone.price).toLocaleString('vi-VN')} VND
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{formatDate(event.openSaleDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingEvent(event)}
                          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-100 transition hover:border-orange-500/60"
                        >
                          Sua
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(event)}
                          disabled={deletingEventId === event.id}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
                        >
                          {deletingEventId === event.id ? 'Dang xoa...' : 'Xoa'}
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

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
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
