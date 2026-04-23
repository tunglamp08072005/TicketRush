import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getAuthSession } from '../../auth/utils/authStorage';
import { checkoutPayment } from '../../order-payment/services/paymentService';
import { removePendingReservation } from '../../order-payment/services/pendingReservationService';
import { getPublicEventDetail, getPublicSeatMap, type SeatMapSeat, type UserEventDetail } from '../services/eventService';
import './EventPaymentPage.css';

type PaymentLocationState = {
  seatIds?: number[];
  reservationId?: string;
};

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

const BANK_TRANSFER_INFO = {
  bankName: 'MB Bank',
  accountNumber: '0359547917',
};

export default function EventPaymentPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const location = useLocation();
  const { token } = getAuthSession();
  const { seatIds = [], reservationId } = (location.state as PaymentLocationState) || {};

  const [eventDetail, setEventDetail] = useState<UserEventDetail | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [bookedQueueId, setBookedQueueId] = useState('');
  const [bookedSeatCodes, setBookedSeatCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      navigate('/auth', { replace: true });
      return;
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      navigate(`/events/${eventId}/booking`, { replace: true });
      return;
    }

    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      setError('Sự kiện không hợp lệ');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [detail, seats] = await Promise.all([
          getPublicEventDetail(id),
          getPublicSeatMap(id),
        ]);
        setEventDetail(detail);
        setSeatMap(seats);
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải dữ liệu thanh toán');
        } else {
          setError('Không thể tải dữ liệu thanh toán');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [eventId, navigate, seatIds, token]);

  const selectedSeats = useMemo(
    () => seatMap.filter(seat => seatIds.includes(seat.id)),
    [seatIds, seatMap],
  );

  const selectedTotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats],
  );

  const handleClose = () => {
    navigate('/events', { replace: true });
  };

  const handleCheckout = async () => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      setCheckoutError('Sự kiện không hợp lệ');
      return;
    }

    if (!paymentProof) {
      setCheckoutError('Vui lòng tải lên ảnh minh chứng thanh toán.');
      return;
    }

    try {
      setSubmitting(true);
      const order = await checkoutPayment({
        eventId: id,
        seatIds,
        paymentProof,
      });

      setCheckoutError('');
      setBookingCompleted(true);
      setBookedQueueId(order.queueId);
      setBookedSeatCodes(order.seatCodes);
      setPaymentProof(null);

      if (reservationId) {
        removePendingReservation(reservationId);
      }
    } catch (err) {
      if (err instanceof Error) {
        setCheckoutError(err.message || 'Không thể tạo đơn thanh toán');
      } else {
        setCheckoutError('Không thể tạo đơn thanh toán');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="event-payment-page">
      <div
        className="event-payment-overlay"
      >
        <section className="event-payment-card">
          <header className="event-payment-header">
            <h1>Thanh toán đặt ghế</h1>
            {!bookingCompleted ? (
              <button type="button" className="event-payment-close" onClick={handleClose}>
                Đóng
              </button>
            ) : null}
          </header>

          {loading && <p className="event-payment-feedback">Đang tải dữ liệu thanh toán...</p>}
          {error && !loading && <p className="event-payment-feedback event-payment-error">{error}</p>}

          {!loading && !error ? (
            bookingCompleted ? (
              <div className="event-payment-success">
                <h2>Bạn đã đặt ghế thành công</h2>
                <p>Mã đơn: <strong>{bookedQueueId}</strong></p>
                <p>Ghế đã đặt: <strong>{bookedSeatCodes.join(', ')}</strong></p>
                <p>Vui lòng chờ admin duyệt thanh toán để vé được xác nhận.</p>
                <button
                  type="button"
                  className="event-payment-primary"
                  onClick={() => navigate('/events')}
                >
                  Về danh sách sự kiện
                </button>
                <button
                  type="button"
                  className="event-payment-primary"
                  onClick={() => navigate('/user', { state: { activeMenu: 'payments' } })}
                >
                  Về mục thanh toán
                </button>
              </div>
            ) : (
              <div className="event-payment-body">
                <p className="event-payment-event">{eventDetail?.name || 'Sự kiện'}</p>
                <p className="event-payment-note">Bạn có thể đóng bước thanh toán bằng nút Đóng. Nếu chưa xác nhận, dữ liệu sẽ không được lưu.</p>

                <div className="event-payment-bank-box">
                  <p><strong>Ngân hàng:</strong> {BANK_TRANSFER_INFO.bankName}</p>
                  <p><strong>Số tài khoản:</strong> {BANK_TRANSFER_INFO.accountNumber}</p>
                  <p><strong>Nội dung chuyển khoản:</strong> {eventDetail?.id || eventId}-{seatIds.join(',')}</p>
                </div>

                <div className="event-payment-summary">
                  <p><strong>Ghế đã chọn:</strong> {selectedSeats.length > 0 ? selectedSeats.map(seat => seat.seatCode).join(', ') : 'Không có ghế hợp lệ'}</p>
                  <p><strong>Tổng tiền:</strong> {formatVnd(selectedTotal)}</p>
                </div>

                <label className="event-payment-upload" htmlFor="paymentProof">
                  Minh chứng thanh toán
                  <input
                    id="paymentProof"
                    type="file"
                    accept="image/*"
                    onChange={event => setPaymentProof(event.target.files?.[0] ?? null)}
                  />
                  <span>{paymentProof ? paymentProof.name : 'Chưa chọn ảnh'}</span>
                </label>

                {checkoutError && <p className="event-payment-feedback event-payment-error">{checkoutError}</p>}

                <button
                  type="button"
                  className="event-payment-primary"
                  disabled={submitting || selectedSeats.length === 0}
                  onClick={() => void handleCheckout()}
                >
                  {submitting ? 'Đang gửi yêu cầu...' : 'Xác nhận thanh toán'}
                </button>
              </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}
