import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TicketItem } from '../../data/dashboardMockData';

interface TicketCardProps {
  ticket: TicketItem;
  isHistory?: boolean;
  historyLabel?: string;
}

function formatReadableTicketCode(value: string): string {
  const compact = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const focused = compact.length > 10 ? compact.slice(-10) : compact;
  const grouped = focused.match(/.{1,4}/g)?.join('-') ?? focused;

  if (compact.length > focused.length) {
    return `...-${grouped}`;
  }

  return grouped;
}

function maskPhoneNumber(value?: string): string | null {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) {
    return null;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

function maskEmail(value?: string): string | null {
  if (!value || !value.includes('@')) {
    return null;
  }

  const [localPart, domain] = value.split('@');
  if (!localPart || !domain) {
    return null;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? '*'}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
}

function MiniQrVisual({ value }: { value: string }) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    let isMounted = true;

    void import('qrcode')
      .then(qrCode => qrCode.toDataURL(value, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 220,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }))
      .then((url: string) => {
        if (isMounted) {
          setQrDataUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setQrDataUrl('');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value]);

  if (!qrDataUrl) {
    return <div className="h-[120px] w-[120px] animate-pulse rounded-lg bg-orange-100" />;
  }

  return <img src={qrDataUrl} alt="Mã QR check-in" className="h-[120px] w-[120px] rounded-lg border border-gray-200 bg-white p-1" />;
}

export default function TicketCard({ ticket, isHistory = false, historyLabel = 'Đã kết thúc' }: TicketCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLElement | null>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const terms = ticket.terms ?? [];
  const displayTicketCode = useMemo(() => formatReadableTicketCode(ticket.ticketCode ?? ticket.id), [ticket.id, ticket.ticketCode]);
  const displayPhone = useMemo(() => maskPhoneNumber(ticket.buyerPhone), [ticket.buyerPhone]);
  const displayEmail = useMemo(() => maskEmail(ticket.buyerEmail), [ticket.buyerEmail]);

  const exportCardAsImage = async () => {
    if (!cardRef.current || exportingImage) {
      return;
    }

    try {
      setExportingImage(true);
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#fff7ed',
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `ticket-${ticket.id}.png`;
      link.click();
    } finally {
      setExportingImage(false);
    }
  };

  const exportCardAsPdf = async () => {
    if (!cardRef.current || exportingPdf) {
      return;
    }

    try {
      setExportingPdf(true);
      const [{ toPng }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ]);
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#fff7ed',
      });

      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (cardRef.current.clientHeight / cardRef.current.clientWidth) * renderWidth;
      const centeredY = Math.max(margin, (pageHeight - renderHeight) / 2);

      pdf.addImage(dataUrl, 'PNG', margin, centeredY, renderWidth, renderHeight);
      pdf.save(`ticket-${ticket.id}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div>
      <article
        ref={cardRef}
        className={`card-3d relative overflow-hidden rounded-2xl border p-5 shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur-xl transition ${
          isHistory
            ? 'border-slate-200/80 bg-gradient-to-br from-slate-100 to-slate-200 opacity-75 grayscale'
            : 'border-orange-200/80 bg-gradient-to-br from-white via-orange-50 to-sky-50'
        }`}
      >
        <div className={`absolute left-0 top-0 h-full w-1 ${isHistory ? 'bg-gray-600' : 'bg-gradient-to-b from-purple-500 via-pink-500 to-orange-500'}`} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent" />
        {isHistory && (
          <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-slate-300 bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-700 shadow-lg">
            {historyLabel}
          </div>
        )}

        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Ticket ID: {ticket.id}</p>
            <p className="mt-1 text-sm text-slate-600" title={ticket.ticketCode ?? ticket.id}>
              Mã vé: <span className="font-semibold text-slate-900">{displayTicketCode}</span>
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{ticket.eventName}</h3>
            <p className="mt-2 rounded-md border border-orange-200 bg-orange-100/80 px-2 py-1 text-sm font-bold text-slate-900">{ticket.eventDate}</p>
            <p className="mt-1 text-sm text-slate-700">{ticket.venue}</p>
            <p className="mt-2 text-base font-bold text-orange-800">{ticket.seat}</p>
            <p className="mt-1 text-base font-semibold text-emerald-700">Hạng vé: {ticket.ticketTier ?? 'Standard'}</p>
          </div>

          <div className="shrink-0 rounded-xl border border-orange-200 bg-white/90 p-2 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
            <div className="mb-2 flex items-center justify-center">
              <MiniQrVisual value={ticket.qrValue ?? `${ticket.id}|${ticket.eventName}`} />
            </div>
          </div>
        </div>

        <div className="mb-3 grid gap-2 rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-slate-600 sm:grid-cols-2">
          <p>
            Người đặt: <span className="font-semibold text-slate-900">{ticket.buyerName ?? 'Chưa cập nhật'}</span>
          </p>
          {displayEmail && (
            <p>
              Email: <span className="font-semibold text-slate-900">{displayEmail}</span>
            </p>
          )}
          {displayPhone && (
            <p>
              SĐT: <span className="font-semibold text-slate-900">{displayPhone}</span>
            </p>
          )}
          <p>
            Check-in:{' '}
            <span className="font-semibold text-slate-900">
              <span className="mr-1" aria-hidden="true">⚠️</span>
              {ticket.checkInInstruction ?? 'Đến cổng check-in đúng giờ quy định.'}
            </span>
          </p>
        </div>

        {ticket.refundStatusMessage && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
            <p>{ticket.refundStatusMessage}</p>
            {ticket.lifecycleStatus === 'cancelled' && (
              <button
                type="button"
                onClick={() => {
                  navigate('/support', {
                    state: {
                      supportTitle: ticket.supportTitle,
                      supportContent: ticket.supportContent,
                      issueType: 'payment',
                    },
                  });
                }}
                className="mt-3 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-500/30"
              >
                Yêu cầu hoàn tiền ngay
              </button>
            )}
          </div>
        )}

        {terms.length > 0 && (
          <div className="mb-3 rounded-xl border border-orange-200 bg-orange-50/80 p-3 text-xs text-slate-700">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-700">Quy định</p>
            <ul className="space-y-1">
              {terms.map(term => (
                <li key={term}>- {term}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500"
            style={{ width: `${ticket.progress}%` }}
          />
        </div>
      </article>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void exportCardAsImage();
          }}
          disabled={exportingImage || exportingPdf}
          className="rounded-lg border border-orange-500/70 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {exportingImage ? 'Đang xuất ảnh...' : 'Lưu vào ảnh'}
        </button>
        <button
          type="button"
          onClick={() => {
            void exportCardAsPdf();
          }}
          disabled={exportingImage || exportingPdf}
          className="rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {exportingPdf ? 'Đang tạo PDF...' : 'Tải PDF'}
        </button>
      </div>
    </div>
  );
}
