import type { TicketItem } from '../../data/dashboardMockData';

interface TicketCardProps {
  ticket: TicketItem;
}

function BarcodeVisual() {
  return (
    <div className="flex h-[88px] items-end justify-center gap-[3px] rounded-xl bg-gray-950 px-3 py-2">
      {[20, 48, 28, 60, 32, 70, 24, 56, 34, 64, 22, 50, 28].map((barHeight, index) => (
        <span key={`${barHeight}-${index}`} className="w-[3px] rounded-sm bg-gray-200/90" style={{ height: `${barHeight}px` }} />
      ))}
    </div>
  );
}

export default function TicketCard({ ticket }: TicketCardProps) {
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500">{ticket.id}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{ticket.eventName}</h3>
          <p className="mt-2 text-sm text-gray-300">{ticket.eventDate}</p>
          <p className="text-sm text-gray-400">{ticket.venue}</p>
          <p className="mt-1 text-xs text-orange-300">{ticket.seat}</p>
        </div>

        <div className="w-[140px] shrink-0 overflow-hidden rounded-xl border border-gray-800 bg-black/40">
          {ticket.visualType === 'thumbnail' && ticket.imageUrl ? (
            <img src={ticket.imageUrl} alt={ticket.eventName} className="h-[88px] w-full object-cover" />
          ) : (
            <BarcodeVisual />
          )}
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
          style={{ width: `${ticket.progress}%` }}
        />
      </div>
    </article>
  );
}
