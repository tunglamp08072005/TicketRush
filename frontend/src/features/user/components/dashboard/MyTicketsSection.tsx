import { useMemo, useState } from 'react';
import type { TicketItem } from '../../data/dashboardMockData';
import { Ticket } from 'lucide-react';
import TicketCard from './TicketCard';

interface MyTicketsSectionProps {
  tickets: TicketItem[];
}

type TicketTab = 'upcoming' | 'history';

const EVENT_ACTIVE_WINDOW_HOURS = 6;

function isHistoryTicket(ticket: TicketItem): boolean {
  if (ticket.lifecycleStatus === 'past' || ticket.lifecycleStatus === 'cancelled' || ticket.lifecycleStatus === 'used') {
    return true;
  }
  if (ticket.lifecycleStatus === 'upcoming') {
    return false;
  }
  if (!ticket.eventDateIso) {
    return false;
  }

  const eventDate = new Date(ticket.eventDateIso);
  if (Number.isNaN(eventDate.getTime())) {
    return false;
  }

  const activeUntil = eventDate.getTime() + EVENT_ACTIVE_WINDOW_HOURS * 60 * 60 * 1000;
  return activeUntil < Date.now();
}

function getHistoryLabel(ticket: TicketItem): string {
  if (ticket.refundStatusMessage && ticket.lifecycleStatus === 'cancelled') {
    return 'Quá hạn duyệt - Chờ hoàn tiền';
  }
  if (ticket.refundStatusMessage && ticket.lifecycleStatus === 'used') {
    return 'Đã hoàn tiền';
  }
  if (ticket.lifecycleStatus === 'cancelled') {
    return 'Đã hủy';
  }
  if (ticket.lifecycleStatus === 'used') {
    return 'Đã sử dụng';
  }
  return 'Đã kết thúc';
}

export default function MyTicketsSection({ tickets }: MyTicketsSectionProps) {
  const [activeTab, setActiveTab] = useState<TicketTab>('upcoming');
  const { upcomingTickets, historyTickets } = useMemo(() => {
    const upcoming: TicketItem[] = [];
    const history: TicketItem[] = [];

    for (const ticket of tickets) {
      if (isHistoryTicket(ticket)) {
        history.push(ticket);
      } else {
        upcoming.push(ticket);
      }
    }

    return { upcomingTickets: upcoming, historyTickets: history };
  }, [tickets]);

  const visibleTickets = activeTab === 'upcoming' ? upcomingTickets : historyTickets;
  const emptyMessage = activeTab === 'upcoming'
    ? 'Chưa có vé sắp diễn ra.'
    : 'Chưa có vé trong lịch sử.';
  const emptyHint = activeTab === 'upcoming'
    ? 'Các vé đã được duyệt cho sự kiện sắp tới sẽ hiển thị tại đây để check-in nhanh.'
    : 'Vé đã kết thúc, đã sử dụng hoặc đã hủy sẽ được lưu ở đây.';

  return (
    <section className="relative w-full">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-[28px] font-extrabold tracking-tight text-white sm:text-3xl">
            Vé của tôi
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Ưu tiên vé sắp diễn ra để bạn mở mã QR check-in nhanh hơn.
          </p>
        </div>

        <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${
              activeTab === 'upcoming'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-950/30'
                : 'text-gray-300 hover:bg-white/8 hover:text-white'
            }`}
          >
            Sắp diễn ra ({upcomingTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${
              activeTab === 'history'
                ? 'bg-gray-700 text-white shadow-lg shadow-black/25'
                : 'text-gray-300 hover:bg-white/8 hover:text-white'
            }`}
          >
            Lịch sử ({historyTickets.length})
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {visibleTickets.length === 0 ? (
          <div className="card-3d flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl md:col-span-2">
            <Ticket className="mb-4 h-16 w-16 text-gray-500 opacity-50" />
            <p className="text-[15px] font-medium text-gray-300">{emptyMessage}</p>
            <p className="mt-1 max-w-md text-[14px] text-gray-400">{emptyHint}</p>
          </div>
        ) : (
          visibleTickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isHistory={activeTab === 'history'}
              historyLabel={getHistoryLabel(ticket)}
            />
          ))
        )}
      </div>
    </section>
  );
}
