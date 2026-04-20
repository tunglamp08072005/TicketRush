import { useEffect, useMemo, useState } from 'react';
import {
  getPublicEventDetail,
  getPublicSeatMap,
  searchPublicEvents,
  type SeatMapSeat,
  type SeatStatus,
  type UserEventDetail,
} from '../../services/eventService';
import { checkoutPayment } from '../../services/paymentService';
import { getMyProfile } from '../../services/userProfileService';

type BookingStep = 1 | 2 | 3;

function formatDateTime(value: string): string {
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

function statusLabel(status: UserEventDetail['status']): string {
  if (status === 'ON_SALE') {
    return 'Đang mở bán';
  }
  if (status === 'UPCOMING') {
    return 'Sắp diễn ra';
  }
  return 'Đã kết thúc';
}

function statusClass(status: UserEventDetail['status']): string {
  if (status === 'ON_SALE') {
    return 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300';
  }
  if (status === 'UPCOMING') {
    return 'border border-amber-500/30 bg-amber-500/15 text-amber-300';
  }
  return 'border border-slate-500/30 bg-slate-500/15 text-slate-300';
}

function seatClass(status: SeatStatus, isSelecting: boolean): string {
  if (isSelecting) {
    return 'bg-orange-500 text-white ring-1 ring-orange-300';
  }
  if (status === 'SOLD') {
    return 'bg-rose-500/80 text-white';
  }
  if (status === 'LOCKED') {
    return 'bg-amber-500/80 text-white';
  }
  return 'bg-emerald-500/80 text-white';
}

function priceLabel(value: number): string {
  return `${Number(value || 0).toLocaleString('vi-VN')} VND`;
}

const stepTitles: Array<{ step: BookingStep; title: string }> = [
  { step: 1, title: 'Thông tin sự kiện' },
  { step: 2, title: 'Chọn chỗ ngồi' },
  { step: 3, title: 'Thanh toán' },
];

export default function EventExplorerSection() {
  const [keyword, setKeyword] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const [events, setEvents] = useState<UserEventDetail[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<UserEventDetail | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapSeat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [profileRequiredMessage, setProfileRequiredMessage] = useState('');

  const fetchEvents = async (search?: string) => {
    try {
      setLoadingEvents(true);
      const data = await searchPublicEvents(search);
      setEvents(data);
      setError('');

      if (data.length === 0) {
        setSelectedEventId(null);
        setSelectedEvent(null);
        setSeatMap([]);
        setSelectedSeatIds([]);
        setCurrentStep(1);
        return;
      }

      const nextId = selectedEventId && data.some(event => event.id === selectedEventId)
        ? selectedEventId
        : data[0].id;
      setSelectedEventId(nextId);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể tải danh sách sự kiện');
      } else {
        setError('Không thể tải danh sách sự kiện');
      }
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const loadBuyerProfileStatus = async () => {
      try {
        const profile = await getMyProfile();
        const missing: string[] = [];
        if (!profile.profile || !profile.profile.trim()) {
          missing.push('họ và tên');
        }
        if (!profile.phoneNumber || !profile.phoneNumber.trim()) {
          missing.push('số điện thoại');
        }

        if (missing.length > 0) {
          setProfileRequiredMessage(`Để mua vé, vui lòng cập nhật đầy đủ: ${missing.join(', ')} trong mục Tài khoản.`);
        } else {
          setProfileRequiredMessage('');
        }
      } catch {
        setProfileRequiredMessage('Không thể kiểm tra hồ sơ người dùng. Vui lòng mở mục Tài khoản để cập nhật thông tin trước khi mua vé.');
      }
    };

    loadBuyerProfileStatus();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    const loadDetailAndSeatMap = async () => {
      try {
        setLoadingDetail(true);
        const [detail, seats] = await Promise.all([
          getPublicEventDetail(selectedEventId),
          getPublicSeatMap(selectedEventId),
        ]);
        setSelectedEvent(detail);
        setSeatMap(seats);
        setSelectedSeatIds([]);
        setCurrentStep(1);
        setPaymentMessage('');
        setPaymentProofFile(null);
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải thông tin sự kiện');
        } else {
          setError('Không thể tải thông tin sự kiện');
        }
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetailAndSeatMap();
  }, [selectedEventId]);

  const selectedSeats = useMemo(() => seatMap.filter(seat => selectedSeatIds.includes(seat.id)), [seatMap, selectedSeatIds]);

  const groupedSeatMap = useMemo(() => {
    const zoneMap = new Map<number, { zoneName: string; zoneColorHex: string; rows: Map<string, SeatMapSeat[]> }>();

    for (const seat of seatMap) {
      if (!zoneMap.has(seat.zoneId)) {
        zoneMap.set(seat.zoneId, {
          zoneName: seat.zoneName,
          zoneColorHex: seat.zoneColorHex,
          rows: new Map<string, SeatMapSeat[]>(),
        });
      }

      const zone = zoneMap.get(seat.zoneId);
      if (!zone) {
        continue;
      }

      if (!zone.rows.has(seat.rowLabel)) {
        zone.rows.set(seat.rowLabel, []);
      }

      zone.rows.get(seat.rowLabel)?.push(seat);
    }

    return Array.from(zoneMap.entries()).map(([zoneId, zone]) => ({
      zoneId,
      zoneName: zone.zoneName,
      zoneColorHex: zone.zoneColorHex,
      rows: Array.from(zone.rows.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([rowLabel, seats]) => ({
          rowLabel,
          seats: [...seats].sort((left, right) => left.seatNumber - right.seatNumber),
        })),
    }));
  }, [seatMap]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchEvents(keyword);
  };

  const toggleSeatSelection = (seat: SeatMapSeat) => {
    if (seat.status !== 'AVAILABLE') {
      return;
    }

    setSelectedSeatIds(prev =>
      prev.includes(seat.id)
        ? prev.filter(id => id !== seat.id)
        : [...prev, seat.id]
    );
  };

  const totalSelectedPrice = selectedSeats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);

  const handleCheckoutPayment = async () => {
    if (!selectedEvent || selectedSeatIds.length === 0) {
      return;
    }

    if (profileRequiredMessage) {
      setError(profileRequiredMessage);
      return;
    }

    if (!paymentProofFile) {
      setError('Vui lòng tải lên ảnh chuyển khoản trước khi thanh toán.');
      return;
    }

    try {
      setSubmittingPayment(true);
      setPaymentMessage('');
      setError('');
      await checkoutPayment({
        eventId: selectedEvent.id,
        seatIds: selectedSeatIds,
        paymentProof: paymentProofFile,
      });

      setPaymentMessage('Đã gửi thanh toán thành công. Đơn hàng đang chờ admin duyệt.');
      setSelectedSeatIds([]);
      setPaymentProofFile(null);
      const seats = await getPublicSeatMap(selectedEvent.id);
      setSeatMap(seats);
      setCurrentStep(1);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể thanh toán');
      } else {
        setError('Không thể thanh toán');
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const zonePriceStats = useMemo(() => {
    if (!selectedEvent?.zones || selectedEvent.zones.length === 0) {
      return null;
    }

    const zonePrices = selectedEvent.zones.map(zone => Number(zone.price || 0));
    const min = Math.min(...zonePrices);
    const max = Math.max(...zonePrices);

    return {
      min,
      max,
      hasRange: min !== max,
    };
  }, [selectedEvent]);

  const canOpenStep = (step: BookingStep) => {
    if (step === 1) {
      return true;
    }
    if (step === 2) {
      return Boolean(selectedEvent);
    }
    return Boolean(selectedEvent) && selectedSeatIds.length > 0;
  };

  const renderSeatMap = () => (
    <div className="space-y-4">
      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1 text-xs text-gray-300">
        <p className="text-sm font-semibold text-gray-200">Sơ đồ chỗ ngồi:</p>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-3 w-3 rounded bg-emerald-500/80" /> Trống (Xanh)
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-3 w-3 rounded bg-amber-500/80" /> Đang giữ (Vàng)
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-3 w-3 rounded bg-rose-500/80" /> Đã bán (Đỏ)
        </span>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-3 w-3 rounded bg-orange-500" /> Đang chọn (Đỏ cam)
        </span>
      </div>

      <div className="space-y-4">
        {groupedSeatMap.map(zone => (
          <article key={zone.zoneId} className="rounded-xl border border-gray-800 bg-gray-950/45 p-3">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.zoneColorHex }} />
              <p className="text-sm font-semibold text-white">{zone.zoneName}</p>
            </div>

            <div className="space-y-2 overflow-x-auto">
              {zone.rows.map(row => (
                <div key={`${zone.zoneId}-${row.rowLabel}`} className="flex min-w-max items-center gap-2">
                  <span className="w-6 text-xs font-semibold text-gray-400">{row.rowLabel}</span>
                  <div className="flex flex-wrap gap-1">
                    {row.seats.map(seat => {
                      const isSelecting = selectedSeatIds.includes(seat.id);
                      return (
                        <span
                          key={seat.id}
                          title={`${seat.seatCode} - ${priceLabel(seat.price)} - ${seat.status}`}
                          onClick={() => toggleSeatSelection(seat)}
                          className={`inline-flex h-6 min-w-6 items-center justify-center rounded text-[10px] font-bold ${seatClass(seat.status, isSelecting)} ${
                            seat.status === 'AVAILABLE' ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed opacity-80'
                          }`}
                        >
                          {seat.seatNumber}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}

        {groupedSeatMap.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-700 px-3 py-4 text-center text-sm text-gray-400">
            Chưa có dữ liệu chỗ ngồi cho sự kiện này.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-gray-800 bg-gray-900/55 p-5">
        <h2 className="text-xl font-bold text-white">Tìm kiếm và xem sự kiện</h2>
        <p className="mt-1 text-sm text-gray-400">Tra cứu thông tin sự kiện và mua vé theo quy trình 3 bước rõ ràng.</p>

        <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-3">
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Nhập tên sự kiện, concert ca nhạc, địa điểm..."
            className="min-w-[260px] flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-orange-500"
          />
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Tìm kiếm
          </button>
          <button
            type="button"
            onClick={async () => {
              setKeyword('');
              await fetchEvents();
            }}
            className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-200"
          >
            Xóa lọc
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/45 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {stepTitles.map(({ step, title }) => {
            const active = currentStep === step;
            const enabled = canOpenStep(step);
            return (
              <button
                key={step}
                type="button"
                disabled={!enabled}
                onClick={() => setCurrentStep(step)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? 'border-orange-500/70 bg-orange-500/15'
                    : enabled
                      ? 'border-gray-700 bg-gray-900/70 hover:border-gray-600'
                      : 'cursor-not-allowed border-gray-800 bg-gray-900/35 opacity-60'
                }`}
              >
                <p className="text-xs text-gray-400">Bước {step}</p>
                <p className="mt-1 text-sm font-semibold text-white">{title}</p>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>
      )}

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl border border-gray-800 bg-gray-900/55 p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-gray-400">Danh sách sự kiện</h3>

          <div className="space-y-2">
            {loadingEvents && <p className="text-sm text-gray-400">Đang tải danh sách...</p>}

            {!loadingEvents && events.length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-700 px-3 py-4 text-center text-sm text-gray-400">
                Không tìm thấy sự kiện phù hợp.
              </p>
            )}

            {!loadingEvents && events.map(event => (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                  selectedEventId === event.id
                    ? 'border-orange-500/70 bg-orange-500/10'
                    : 'border-gray-800 bg-gray-950/50 hover:border-gray-700'
                }`}
              >
                <p className="line-clamp-1 text-sm font-semibold text-white">{event.name}</p>
                <p className="mt-1 line-clamp-1 text-xs text-gray-400">{event.location}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass(event.status)}`}>
                    {statusLabel(event.status)}
                  </span>
                  <span className="text-[11px] text-gray-400">{formatDateTime(event.openSaleDate)}</span>
                </div>
              </button>
            ))}
          </div>

        </aside>

        <section className="rounded-2xl border border-gray-800 bg-gray-900/55 p-5">
          {loadingDetail && <p className="text-sm text-gray-400">Đang tải chi tiết sự kiện...</p>}

          {!loadingDetail && !selectedEvent && (
            <div className="rounded-xl border border-dashed border-gray-700 px-4 py-6 text-center text-sm text-gray-400">
              Chọn một sự kiện để bắt đầu quy trình mua vé.
            </div>
          )}

          {!loadingDetail && selectedEvent && currentStep === 1 && (
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-[360px_1fr]">
                <img
                  src={selectedEvent.thumbnailUrl || selectedEvent.heroImageUrl}
                  alt={selectedEvent.name}
                  className="h-80 w-full rounded-2xl object-cover"
                />

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-bold text-white">{selectedEvent.name}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(selectedEvent.status)}`}>
                      {statusLabel(selectedEvent.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedEvent.description}</p>

                  <div className="grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
                    <p><span className="text-gray-500">Địa điểm:</span> {selectedEvent.location}</p>
                    <p><span className="text-gray-500">Mở bán:</span> {formatDateTime(selectedEvent.openSaleDate)}</p>
                    <p><span className="text-gray-500">Diễn ra:</span> {formatDateTime(selectedEvent.eventStartDate)}</p>
                    <p><span className="text-gray-500">Tổng số ghế:</span> {selectedEvent.totalSeatCount.toLocaleString('vi-VN')}</p>
                  </div>

                  <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-3 text-sm text-gray-300">
                    <p>
                      <span className="text-gray-500">Giá vé:</span>{' '}
                      {zonePriceStats
                        ? zonePriceStats.hasRange
                          ? `${priceLabel(zonePriceStats.min)} - ${priceLabel(zonePriceStats.max)}`
                          : priceLabel(zonePriceStats.min)
                        : 'Chưa có thông tin'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">Giá được tổng hợp từ các khu vực ghế của sự kiện.</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Tiếp tục: Chọn chỗ ngồi
              </button>
            </div>
          )}

          {!loadingDetail && selectedEvent && currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.25fr]">
                <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                  <p className="mb-3 text-sm font-semibold text-gray-200">Sơ đồ khu vực</p>
                  {selectedEvent.layoutMapUrl ? (
                    <img
                      src={selectedEvent.layoutMapUrl}
                      alt={`Sơ đồ ${selectedEvent.name}`}
                      className="mx-auto max-h-[520px] w-auto max-w-full rounded-xl border border-gray-800 object-contain"
                    />
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-700 px-3 py-10 text-center text-sm text-gray-400">
                      Sự kiện chưa có ảnh sơ đồ khu vực.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-gray-800 bg-gray-950/40 p-4">
                  {renderSeatMap()}
                </div>
              </div>

              <p className="text-xs text-gray-400">Đã chọn {selectedSeatIds.length} ghế.</p>
              {selectedSeatIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-300"
                >
                  Tiếp tục: Thanh toán
                </button>
              )}
            </div>
          )}

          {!loadingDetail && selectedEvent && currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Xác nhận thanh toán</h3>
              <p className="text-sm text-gray-300">Sự kiện: {selectedEvent.name}</p>
              <p className="text-sm text-gray-300">Số ghế đã chọn: {selectedSeatIds.length}</p>
              {selectedSeats.length > 0 && (
                <p className="text-xs text-gray-400">Ghế: {selectedSeats.map(seat => seat.seatCode).join(', ')}</p>
              )}
              <p className="text-sm font-semibold text-white">Tạm tính: {priceLabel(totalSelectedPrice)}</p>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <p className="font-semibold">Thông tin chuyển khoản</p>
                <p className="mt-1">Ngân hàng: Techcombank</p>
                <p>Số tài khoản: 1142989669</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="payment-proof" className="block text-sm font-semibold text-gray-200">
                  Ảnh chuyển khoản
                </label>
                <input
                  id="payment-proof"
                  type="file"
                  accept="image/*"
                  onChange={event => {
                    const file = event.target.files?.[0] ?? null;
                    setPaymentProofFile(file);
                  }}
                  className="block w-full cursor-pointer rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                {paymentProofFile && (
                  <p className="text-xs text-gray-400">Đã chọn: {paymentProofFile.name}</p>
                )}
              </div>

              {profileRequiredMessage && (
                <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
                  {profileRequiredMessage}
                </div>
              )}

              {paymentMessage && (
                <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  {paymentMessage}
                </p>
              )}
              <button
                type="button"
                disabled={submittingPayment || selectedSeatIds.length === 0 || Boolean(profileRequiredMessage)}
                onClick={handleCheckoutPayment}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingPayment ? 'Đang gửi thanh toán...' : 'Tiến hành thanh toán'}
              </button>
            </div>
          )}
        </section>
      </div>

    </section>
  );
}
