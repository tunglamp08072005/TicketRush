import type { TicketItem } from '../../data/dashboardMockData';
import { Ticket } from 'lucide-react';
import TicketCard from './TicketCard';

interface MyTicketsSectionProps {
  tickets: TicketItem[];
}

export default function MyTicketsSection({ tickets }: MyTicketsSectionProps) {
  return (
    <section className="relative w-full">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute -left-4 top-0 h-32 w-32 rounded-full bg-purple-600/10 blur-[60px]" />
      <div className="pointer-events-none absolute -right-4 bottom-0 h-40 w-40 rounded-full bg-pink-600/10 blur-[80px]" />
      
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-[28px] font-extrabold tracking-tight text-white sm:text-3xl">
          Vé của tôi 
          <span className="ml-3 text-[18px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">({tickets.length} sắp tới)</span>
        </h2>
        <button
          type="button"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-[14px] font-semibold text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:border-purple-500/30 hover:text-white"
        >
          Xem tất cả
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {tickets.length === 0 ? (
          <div className="card-3d md:col-span-2 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
            <Ticket className="h-16 w-16 text-gray-500 mb-4 opacity-50" />
            <p className="text-[15px] font-medium text-gray-300">Chưa có vé điện tử nào được duyệt.</p>
            <p className="text-[14px] text-gray-400 mt-1">Sau khi admin duyệt thanh toán, vé sẽ tự động xuất hiện tại đây.</p>
          </div>
        ) : (
          tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </div>
    </section>
  );
}