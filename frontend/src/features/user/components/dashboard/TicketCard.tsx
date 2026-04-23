import type { TicketItem } from '../../data/dashboardMockData';

interface TicketCardProps {
  ticket: TicketItem;
}

function MiniQrVisual({ value }: { value: string }) {
  const bits = value
    .split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join('')
    .slice(0, 196)
    .padEnd(196, '0');

  return (
    <div className="grid h-[88px] w-[88px] grid-cols-14 gap-[1px] rounded-lg bg-white p-1">
      {bits.split('').map((bit, index) => (
        <span key={index} className={bit === '1' ? 'bg-black' : 'bg-white'} />
      ))}
    </div>
  );
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
  const terms = ticket.terms ?? [];

  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500">Ticket ID: {ticket.id}</p>
          <p className="mt-1 text-xs text-gray-400">Mã vé: {ticket.ticketCode ?? ticket.id}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{ticket.eventName}</h3>
          <p className="mt-2 text-sm text-gray-300">{ticket.eventDate}</p>
          <p className="text-sm text-gray-400">{ticket.venue}</p>
          <p className="mt-1 text-xs text-orange-300">{ticket.seat}</p>
          <p className="mt-1 text-xs text-emerald-300">Hạng vé: {ticket.ticketTier ?? 'Standard'}</p>
        </div>

        <div className="shrink-0 rounded-xl border border-gray-800 bg-black/40 p-2">
          <div className="mb-2 flex items-center justify-center">
            <MiniQrVisual value={ticket.qrValue ?? `${ticket.id}|${ticket.eventName}`} />
          </div>
          <div className="w-[140px] overflow-hidden rounded-lg border border-gray-800 bg-gray-950/80">
            {ticket.visualType === 'thumbnail' && ticket.imageUrl ? (
              <img src={ticket.imageUrl} alt={ticket.eventName} className="h-[88px] w-full object-cover" />
            ) : (
              <BarcodeVisual />
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 grid gap-2 rounded-xl border border-gray-800 bg-gray-950/45 p-3 text-xs text-gray-300 sm:grid-cols-2">
        <p>
          Người đặt: <span className="font-semibold text-white">{ticket.buyerName ?? 'Chưa cập nhật'}</span>
        </p>
        <p>
          Email: <span className="font-semibold text-white">{ticket.buyerEmail ?? 'Chưa cập nhật'}</span>
        </p>
        <p>
          SĐT: <span className="font-semibold text-white">{ticket.buyerPhone ?? 'Chưa cập nhật'}</span>
        </p>
        <p>
          Check-in: <span className="font-semibold text-white">{ticket.checkInInstruction ?? 'Đến cổng check-in đúng giờ quy định.'}</span>
        </p>
      </div>

      {terms.length > 0 && (
        <div className="mb-3 rounded-xl border border-gray-800 bg-gray-950/45 p-3 text-xs text-gray-300">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Quy định</p>
          <ul className="space-y-1">
            {terms.map(term => (
              <li key={term}>- {term}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
          style={{ width: `${ticket.progress}%` }}
        />
      </div>
    </article>
  );
}
