import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { TicketItem } from '../../data/dashboardMockData';

interface TicketCardProps {
  ticket: TicketItem;
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

    void QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
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
    return <div className="h-[120px] w-[120px] animate-pulse rounded-lg bg-gray-800" />;
  }

  return <img src={qrDataUrl} alt="Mã QR check-in" className="h-[120px] w-[120px] rounded-lg border border-gray-200 bg-white p-1" />;
}

export default function TicketCard({ ticket }: TicketCardProps) {
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
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#111827',
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
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#111827',
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
      <article ref={cardRef} className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500">Ticket ID: {ticket.id}</p>
            <p className="mt-1 text-sm text-gray-300" title={ticket.ticketCode ?? ticket.id}>
              Mã vé: <span className="font-semibold text-white">{displayTicketCode}</span>
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">{ticket.eventName}</h3>
            <p className="mt-2 rounded-md border border-gray-700 bg-gray-950/60 px-2 py-1 text-sm font-bold text-white">{ticket.eventDate}</p>
            <p className="mt-1 text-sm text-gray-200">{ticket.venue}</p>
            <p className="mt-2 text-base font-bold text-orange-300">{ticket.seat}</p>
            <p className="mt-1 text-base font-semibold text-emerald-300">Hạng vé: {ticket.ticketTier ?? 'Standard'}</p>
          </div>

          <div className="shrink-0 rounded-xl border border-gray-800 bg-black/40 p-2">
            <div className="mb-2 flex items-center justify-center">
              <MiniQrVisual value={ticket.qrValue ?? `${ticket.id}|${ticket.eventName}`} />
            </div>
          </div>
        </div>

        <div className="mb-3 grid gap-2 rounded-xl border border-gray-800 bg-gray-950/45 p-3 text-xs text-gray-300 sm:grid-cols-2">
          <p>
            Người đặt: <span className="font-semibold text-white">{ticket.buyerName ?? 'Chưa cập nhật'}</span>
          </p>
          {displayEmail && (
            <p>
              Email: <span className="font-semibold text-white">{displayEmail}</span>
            </p>
          )}
          {displayPhone && (
            <p>
              SĐT: <span className="font-semibold text-white">{displayPhone}</span>
            </p>
          )}
          <p>
            Check-in:{' '}
            <span className="font-semibold text-white">
              <span className="mr-1" aria-hidden="true">
                ⚠️
              </span>
              {ticket.checkInInstruction ?? 'Đến cổng check-in đúng giờ quy định.'}
            </span>
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

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void exportCardAsImage();
          }}
          disabled={exportingImage || exportingPdf}
          className="rounded-lg border border-orange-500/70 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {exportingImage ? 'Đang xuất ảnh...' : 'Lưu vào ảnh'}
        </button>
        <button
          type="button"
          onClick={() => {
            void exportCardAsPdf();
          }}
          disabled={exportingImage || exportingPdf}
          className="rounded-lg border border-gray-600 px-3 py-2 text-xs font-semibold text-gray-100 transition hover:border-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {exportingPdf ? 'Đang tạo PDF...' : 'Tải PDF'}
        </button>
      </div>
    </div>
  );
}
