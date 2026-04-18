import { useEffect, useState } from 'react';
import AddEventForm from '../components/admin/AddEventForm';
import { fetchAdminEvents, type AdminEvent } from '../services/eventApi';

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminEvents();
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

  return (
    <div className="min-h-screen bg-gray-950 px-6 py-8 text-gray-100 lg:px-10">
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
                <th className="px-4 py-3">Ngay mo ban</th>
                <th className="px-4 py-3">Trang thai</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Dang tai du lieu...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
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
                    <td className="px-4 py-3 text-gray-300">{formatDate(event.openSaleDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(event.status)}`}>
                        {event.status}
                      </span>
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
          <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
            <AddEventForm
              onCancel={() => setIsAddModalOpen(false)}
              onCreated={async () => {
                setIsAddModalOpen(false);
                await loadEvents();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
