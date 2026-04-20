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
        {tickets.length === 0 ? (
          <div className="md:col-span-2 rounded-2xl border border-dashed border-gray-700 bg-gray-900/45 px-4 py-8 text-center text-sm text-gray-300">
            Chưa có vé điện tử nào được duyệt. Sau khi admin duyệt thanh toán, vé sẽ hiển thị tại đây.
          </div>
        ) : (
          tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </section>
  );
}
