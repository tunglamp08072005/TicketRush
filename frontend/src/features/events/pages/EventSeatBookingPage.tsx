import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAuthSession } from '../../auth/utils/authStorage';
import { createPendingReservation } from '../../order-payment/services/pendingReservationService';
import { holdSeatsForPayment } from '../../order-payment/services/paymentService';
import { getMyProfile } from '../../user/services/userProfileService';
import {
  getPublicEventDetail,
  getPublicSeatMap,
  type SeatMapSeat,
  type UserEventDetail,
} from '../services/eventService';
import './EventSeatBookingPage.css';

type SeatGroup = {
  zoneId: number;
  zoneName: string;
  zoneCode: string;
  zoneColorHex: string;
  seats: SeatMapSeat[];
};

const DEFAULT_HOLD_RESERVATION_MINUTES = 10;
const SEAT_MAP_REFRESH_INTERVAL_MS = 5000;

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

function formatHoldDurationLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (remainMinutes === 0) {
    return `${hours} giờ`;
  }

  return `${hours} giờ ${remainMinutes} phút`;
}

export default function EventSeatBookingPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { token } = getAuthSession();
  const isLoggedIn = Boolean(token);

  const [eventDetail, setEventDetail] = useState<UserEventDetail | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatLoading, setSeatLoading] = useState(true);
  const [error, setError] = useState('');
  const [seatError, setSeatError] = useState('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [profileChecking, setProfileChecking] = useState(false);
  const [profileEligible, setProfileEligible] = useState(false);

  useEffect(() => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      setError('Sự kiện không hợp lệ');
      setLoading(false);
      setSeatLoading(false);
      return;
    }

    const loadDetail = async () => {
      try {
        setLoading(true);
        const data = await getPublicEventDetail(id);
        setEventDetail(data);
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải thông tin sự kiện');
        } else {
          setError('Không thể tải thông tin sự kiện');
        }
      } finally {
        setLoading(false);
      }
    };

    const loadSeatMap = async () => {
      try {
        setSeatLoading(true);
        const seats = await getPublicSeatMap(id);
        setSeatMap(seats);
        setSeatError('');
      } catch (err) {
        if (err instanceof Error) {
          setSeatError(err.message || 'Không thể tải sơ đồ ghế');
        } else {
          setSeatError('Không thể tải sơ đồ ghế');
        }
      } finally {
        setSeatLoading(false);
      }
    };

    void loadDetail();
    void loadSeatMap();
  }, [eventId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setProfileEligible(false);
      return;
    }

    const loadProfileEligibility = async () => {
      try {
        setProfileChecking(true);
        const profile = await getMyProfile();
        const hasFullName = Boolean((profile.profile || '').trim());
        const hasPhone = Boolean((profile.phoneNumber || '').trim());
        setProfileEligible(hasFullName && hasPhone);
      } catch {
        setProfileEligible(false);
      } finally {
        setProfileChecking(false);
      }
    };

    void loadProfileEligibility();
  }, [isLoggedIn]);

  const seatGroups = useMemo<SeatGroup[]>(() => {
    const map = new Map<number, SeatGroup>();

    for (const seat of seatMap) {
      const existing = map.get(seat.zoneId);
      if (!existing) {
        map.set(seat.zoneId, {
          zoneId: seat.zoneId,
          zoneName: seat.zoneName,
          zoneCode: seat.zoneCode,
          zoneColorHex: seat.zoneColorHex,
          seats: [seat],
        });
        continue;
      }
      existing.seats.push(seat);
    }

    return [...map.values()].map(group => ({
      ...group,
      seats: group.seats.sort((left, right) => {
        if (left.rowLabel === right.rowLabel) {
          return left.seatNumber - right.seatNumber;
        }
        return left.rowLabel.localeCompare(right.rowLabel);
      }),
    }));
  }, [seatMap]);

  const selectedSeats = useMemo(
    () => seatMap.filter(seat => selectedSeatIds.includes(seat.id)),
    [seatMap, selectedSeatIds],
  );

  const selectedTotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats],
  );

  const holdMinutes = useMemo(() => {
    if (!eventDetail || !Number.isFinite(eventDetail.seatHoldMinutes) || eventDetail.seatHoldMinutes <= 0) {
      return DEFAULT_HOLD_RESERVATION_MINUTES;
    }

    return eventDetail.seatHoldMinutes;
  }, [eventDetail]);

  const holdDurationLabel = useMemo(() => formatHoldDurationLabel(holdMinutes), [holdMinutes]);

  const canBookSeats = isLoggedIn && profileEligible && !profileChecking;

  useEffect(() => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      return;
    }

    const refreshSeatMap = async () => {
      try {
        const freshSeatMap = await getPublicSeatMap(id);
        setSeatMap(freshSeatMap);
        setSelectedSeatIds(prevSelectedSeatIds => {
          const availableSeatIds = new Set(
            freshSeatMap
              .filter(seat => seat.status === 'AVAILABLE')
              .map(seat => seat.id),
          );
          const nextSelectedSeatIds = prevSelectedSeatIds.filter(seatId => availableSeatIds.has(seatId));

          if (nextSelectedSeatIds.length !== prevSelectedSeatIds.length) {
            setSeatError('Một số ghế vừa thay đổi trạng thái. Hệ thống đã cập nhật lại sơ đồ ghế.');
          }

          return nextSelectedSeatIds;
        });
      } catch {
        // Ignore transient polling errors and preserve the last successful seat map.
      }
    };

    const timer = window.setInterval(() => {
      void refreshSeatMap();
    }, SEAT_MAP_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [eventId]);

  const handleBack = () => {
    const id = eventDetail?.id ?? Number(eventId);
    if (Number.isFinite(id)) {
      navigate(isLoggedIn ? `/user/events/${id}` : `/events/${id}`);
      return;
    }

    if (isLoggedIn) {
      navigate('/user', { state: { activeMenu: 'events' } });
      return;
    }

    navigate('/events');
  };

  const handleCancel = () => {
    if (isLoggedIn) {
      navigate('/user', { state: { activeMenu: 'events' } });
      return;
    }

    navigate('/events');
  };

  const toggleSeat = (seat: SeatMapSeat) => {
    if (!canBookSeats || seat.status !== 'AVAILABLE') {
      return;
    }

    setSelectedSeatIds(prev => {
      if (prev.includes(seat.id)) {
        return prev.filter(item => item !== seat.id);
      }
      return [...prev, seat.id];
    });
  };

  const handleBookAndPayNow = () => {
    const id = Number(eventId);
    if (!Number.isFinite(id) || selectedSeatIds.length === 0) {
      return;
    }

    navigate(`/user/events/${id}/booking/payment`, {
      state: {
        seatIds: selectedSeatIds,
      },
    });
  };

  const handleHoldSeat = async () => {
    const id = Number(eventId);
    if (!Number.isFinite(id) || selectedSeatIds.length === 0 || !eventDetail) {
      return;
    }

    try {
      const holdResult = await holdSeatsForPayment(id, selectedSeatIds);
      const selectedSeatCodes = selectedSeats.map(seat => seat.seatCode);
      const holdMinutes = Number.isFinite(holdResult.holdMinutes) && holdResult.holdMinutes > 0
        ? holdResult.holdMinutes
        : eventDetail.seatHoldMinutes;

      createPendingReservation({
        eventId: id,
        eventName: eventDetail.name,
        eventLocation: eventDetail.location,
        seatIds: selectedSeatIds,
        seatCodes: selectedSeatCodes,
        totalAmount: selectedTotal,
        holdMinutes,
      });

      setSeatError('');
      setSelectedSeatIds([]);

      navigate('/user', {
        state: {
          activeMenu: 'payments',
        },
      });
    } catch (err) {
      if (err instanceof Error) {
        setSeatError(err.message || 'Không thể giữ ghế. Vui lòng thử lại.');
      } else {
        setSeatError('Không thể giữ ghế. Vui lòng thử lại.');
      }

      try {
        const freshSeatMap = await getPublicSeatMap(id);
        setSeatMap(freshSeatMap);
      } catch {
        // Ignore refresh errors; primary error is already shown.
      }
    }
  };

  return (
    <main className="seat-booking-page">
      <div
        className="seat-booking-overlay"
      >
        <section className="seat-booking-content">
          <div className="seat-booking-top-actions">
            <button type="button" className="seat-booking-back" onClick={handleBack}>Quay lại thông tin sự kiện</button>
            <button type="button" className="seat-booking-cancel" onClick={handleCancel}>Hủy</button>
          </div>

        {loading && <p className="seat-booking-feedback">Đang tải thông tin sự kiện...</p>}
        {error && !loading && <p className="seat-booking-feedback seat-booking-error">{error}</p>}

        {!loading && !error && eventDetail ? (
          <article className="seat-booking-card">
            <header className="seat-booking-header">
              <h1>{eventDetail.name}</h1>
              <p>{eventDetail.location}</p>
            </header>

            {eventDetail.layoutMapUrl ? (
              <div className="seat-layout-wrap">
                <h2>Sơ đồ khu vực</h2>
                <img src={eventDetail.layoutMapUrl} alt={`Sơ đồ chỗ ngồi - ${eventDetail.name}`} className="seat-layout-image" />
              </div>
            ) : null}

            <section className="seat-booking-panel">
              <h2>Chọn ghế</h2>
              {seatLoading && <p className="seat-booking-feedback">Đang tải sơ đồ ghế...</p>}
              {seatError && !seatLoading && <p className="seat-booking-feedback seat-booking-error">{seatError}</p>}

              {!seatLoading && !seatError ? (
                <>
                  <div className="seat-legend">
                    <span><i className="seat-dot available" /> Còn trống</span>
                    <span><i className="seat-dot selected" /> Đang chọn</span>
                    <span><i className="seat-dot locked" /> Đang giữ</span>
                    <span><i className="seat-dot sold" /> Đã bán</span>
                  </div>

                  <div className="seat-zone-list">
                    {seatGroups.map(group => (
                      <section key={group.zoneId} className="seat-zone-card">
                        <header>
                          <h3>
                            {group.zoneName}
                            <span>{group.zoneCode}</span>
                          </h3>
                          <b style={{ color: group.zoneColorHex }}>{group.zoneColorHex}</b>
                        </header>

                        <div className="seat-grid">
                          {group.seats.map(seat => {
                            const isSelected = selectedSeatIds.includes(seat.id);
                            const baseClass = seat.status.toLowerCase();

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                className={`seat-item ${baseClass} ${isSelected ? 'selected' : ''}`.trim()}
                                disabled={seat.status !== 'AVAILABLE' || !canBookSeats}
                                onClick={() => toggleSeat(seat)}
                                title={`${seat.seatCode} - ${formatVnd(seat.price)}`}
                              >
                                {seat.seatCode}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>

                  {!isLoggedIn ? (
                    <div className="seat-auth-note">
                      <p>Bạn cần đăng nhập để chọn ghế và thanh toán.</p>
                      <Link to={`/auth?redirect=${encodeURIComponent(`/user/events/${eventDetail.id}/booking`)}`} className="seat-booking-primary">Đăng nhập</Link>
                    </div>
                  ) : profileChecking ? (
                    <div className="seat-auth-note">
                      <p>Đang kiểm tra hồ sơ người dùng...</p>
                    </div>
                  ) : !profileEligible ? (
                    <div className="seat-auth-note">
                      <p>Bạn cần cập nhật Họ và tên + Số điện thoại trong hồ sơ trước khi đặt vé.</p>
                      <button
                        type="button"
                        className="seat-booking-primary"
                        onClick={() => navigate('/user', { state: { activeMenu: 'account' } })}
                      >
                        Cập nhật hồ sơ
                      </button>
                    </div>
                  ) : (
                    <div className="seat-checkout-box">
                      <div className="seat-checkout-summary">
                        <p><strong>Ghế đã chọn:</strong> {selectedSeats.length > 0 ? selectedSeats.map(seat => seat.seatCode).join(', ') : 'Chưa chọn ghế'}</p>
                        <p><strong>Tổng tiền:</strong> {formatVnd(selectedTotal)}</p>
                      </div>

                      <p className="seat-checkout-note">
                        Đặt chỗ sẽ thanh toán ngay. Giữ chỗ sẽ đưa vào mục Thanh toán và giữ trong {holdDurationLabel}.
                      </p>

                      <p className="seat-checkout-note">
                        Sơ đồ ghế đang tự làm mới mỗi {SEAT_MAP_REFRESH_INTERVAL_MS / 1000} giây để cập nhật trạng thái mới nhất.
                      </p>

                      <div className="seat-booking-action-row">
                        <button
                          type="button"
                          className="seat-booking-primary"
                          disabled={selectedSeatIds.length === 0}
                          onClick={handleBookAndPayNow}
                        >
                          Đặt chỗ và thanh toán ngay
                        </button>

                        <button
                          type="button"
                          className="seat-booking-secondary"
                          disabled={selectedSeatIds.length === 0}
                          onClick={() => void handleHoldSeat()}
                        >
                          Giữ chỗ {holdDurationLabel}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </section>
          </article>
        ) : null}
        </section>
      </div>
    </main>
  );
}
