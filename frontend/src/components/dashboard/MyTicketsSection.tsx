import type { TicketItem } from '../../data/dashboardMockData';
import TicketCard from './TicketCard';

interface MyTicketsSectionProps {
  tickets: TicketItem[];
}

export default function MyTicketsSection({ tickets }: MyTicketsSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Vé của tôi ({tickets.length} sắp tới)</h2>
        <button
          type="button"
          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 transition hover:border-orange-500/70 hover:text-white"
        >
          Xem tất cả
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </section>
  );
}
