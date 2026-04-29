import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { checkoutPayment, createVnPayPayment, fetchMyPayments } from '../../order-payment/services/paymentService';
import { getAuthSession } from '../../auth/utils/authStorage';
import { removePendingReservation } from '../../order-payment/services/pendingReservationService';
import { getPublicEventDetail, getPublicSeatMap, type SeatMapSeat, type UserEventDetail } from '../services/eventService';
import { heartbeatVirtualQueue, sendVirtualQueueReleaseBeacon } from '../services/virtualQueueService';
import {
  clearAllQueueTokensInSession,
  getQueueAdmittedUntilFromSession,
  getQueueTokenFromSession,
  setQueueAdmittedUntilInSession,
  setQueueTokenInSession,
} from '../utils/queueSessionStorage';
import './EventPaymentPage.css';

type PaymentLocationState = {
  seatIds?: number[];
  reservationId?: string;
  queueToken?: string;
};

type PaymentMethod = 'vnpay' | 'bank';

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}đ`;
}

const BANK_TRANSFER_INFO = {
  bankName: 'MB Bank',
  accountNumber: '0359547917',
};
const HEARTBEAT_INTERVAL_MS = 30000;
const SEAT_MAP_REFRESH_INTERVAL_MS = 5000;

export default function EventPaymentPage() {
  const navigate = useNavigate();
  const { eventId, orderId } = useParams();
  const parsedEventId = Number(eventId);
  const parsedOrderId = orderId ? Number(orderId) : undefined;
  const location = useLocation();
  const { token } = getAuthSession();
  const {
    seatIds: seatIdsFromState = [],
    reservationId: reservationIdFromState,
    queueToken: queueTokenFromState,
  } = (location.state as PaymentLocationState) || {};

  // State for fetched order (if orderId is present)
  const [orderData, setOrderData] = useState<any>(null);
  const [orderLoading, setOrderLoading] = useState(!!parsedOrderId);

  // If orderId is present, fetch order from backend
  useEffect(() => {
    if (!parsedOrderId) return;
    setOrderLoading(true);
    fetchMyPayments()
      .then(orders => {
        const found = orders.find(o => o.orderId === parsedOrderId);
        if (found) {
          setOrderData(found);
        }
      })
      .finally(() => {
        setOrderLoading(false);
      });
  }, [parsedOrderId]);

  // Derive seatIds, reservationId, queueToken
  const seatIds = useMemo(() => {
    if (orderData) {
      // Prefer explicit seatIds stored on the order object, then fall back to state
      return orderData.seatIds?.length ? orderData.seatIds : seatIdsFromState;
    }
    return seatIdsFromState;
  }, [orderData, seatIdsFromState]);

  const reservationId = orderData?.queueId || reservationIdFromState;
  const queueToken = queueTokenFromState || getQueueTokenFromSession(parsedEventId);

  useEffect(() => {
    if (!Number.isFinite(parsedEventId) || !queueToken) {
      return;
    }

    setQueueTokenInSession(parsedEventId, queueToken);
    setQueueAdmittedUntilInSession(parsedEventId, getQueueAdmittedUntilFromSession(parsedEventId));
  }, [parsedEventId, queueToken]);

  const [eventDetail, setEventDetail] = useState<UserEventDetail | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vnpay');
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

    // Wait for order data to finish loading before doing any redirect
    if (orderLoading) {
      return;
    }

    const id = Number(eventId);

    // When coming from dashboard (existing reservation), queueToken & seatIds
    // are provided via location state — skip the "session expired" redirect.
    const isResumedReservation = !!reservationIdFromState;

    // Only require queueToken when NOT resuming an existing reservation
    if (!isResumedReservation && Number.isFinite(id) && !queueToken && !bookingCompleted) {
      setError('Phiên vào cổng đã hết hoặc bị mất. Vui lòng vào lại phòng chờ để tiếp tục thanh toán.');
      navigate(`/user/events/${id}/waiting-room`, { replace: true });
      return;
    }

    // Only redirect back to seat booking when NOT resuming an existing reservation
    if (!isResumedReservation && (!Array.isArray(seatIds) || seatIds.length === 0)) {
      navigate(`/user/events/${eventId}/booking`, { replace: true });
      return;
    }

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
  }, [bookingCompleted, eventId, navigate, orderLoading, queueToken, reservationIdFromState, seatIds, token]);

  useEffect(() => {
    const id = Number(eventId);
    if (!Number.isFinite(id) || !queueToken || !token || bookingCompleted) {
      return;
    }

    const timer = window.setInterval(() => {
      void heartbeatVirtualQueue(id, queueToken)
        .then(status => {
          setQueueAdmittedUntilInSession(id, status.admittedUntilEpochMs ?? null);
        })
        .catch(() => {
          // Checkout flow handles expired/invalid queue token from backend responses.
        });
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [bookingCompleted, eventId, queueToken, token]);

  const selectedSeats = useMemo(
    () => seatMap.filter(seat => seatIds.includes(seat.id)),
    [seatIds, seatMap],
  );

  const selectedTotal = useMemo(
    () => selectedSeats.reduce((sum, seat) => sum + seat.price, 0),
    [selectedSeats],
  );

  useEffect(() => {
    if (bookingCompleted) {
      return;
    }

    const id = Number(eventId);
    if (!token || !Number.isFinite(id) || !Array.isArray(seatIds) || seatIds.length === 0) {
      return;
    }

    const refreshSeatMap = async () => {
      try {
        const freshSeatMap = await getPublicSeatMap(id);
        setSeatMap(freshSeatMap);
      } catch {
        // Ignore transient polling errors and keep the last successful snapshot.
      }
    };

    const timer = window.setInterval(() => {
      void refreshSeatMap();
    }, SEAT_MAP_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [bookingCompleted, eventId, seatIds, token]);

  const handleClose = () => {
    if (Number.isFinite(parsedEventId) && queueToken) {
      sendVirtualQueueReleaseBeacon(parsedEventId, queueToken);
    }

    clearAllQueueTokensInSession();
    window.location.href = '/user';
  };

  const handleVnPayCheckout = async () => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      setCheckoutError('Sự kiện không hợp lệ');
      return;
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      setCheckoutError('Bạn chưa chọn ghế để thanh toán.');
      return;
    }

    if (!queueToken) {
      setCheckoutError('Không tìm thấy queue token hợp lệ. Vui lòng vào lại phòng chờ và thử lại.');
      return;
    }

    try {
      setSubmitting(true);
      const checkout = await createVnPayPayment(id, seatIds, queueToken);

      setCheckoutError('');
      clearAllQueueTokensInSession();

      if (reservationId) {
        removePendingReservation(reservationId);
      }

      window.location.assign(checkout.paymentUrl);
    } catch (err) {
      if (err instanceof Error) {
        setCheckoutError(err.message || 'Không thể tạo thanh toán VNPAY');
      } else {
        setCheckoutError('Không thể tạo thanh toán VNPAY');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBankCheckout = async () => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      setCheckoutError('Sự kiện không hợp lệ');
      return;
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      setCheckoutError('Bạn chưa chọn ghế để thanh toán.');
      return;
    }

    if (!paymentProof) {
      setCheckoutError('Vui lòng tải lên ảnh minh chứng thanh toán.');
      return;
    }

    if (!queueToken) {
      setCheckoutError('Không tìm thấy queue token hợp lệ. Vui lòng vào lại phòng chờ và thử lại.');
      return;
    }

    try {
      setSubmitting(true);
      const order = await checkoutPayment({
        eventId: id,
        seatIds,
        paymentProof,
        queueToken,
      });

      setCheckoutError('');
      setBookingCompleted(true);
      setBookedQueueId(order.queueId);
      setBookedSeatCodes(order.seatCodes);
      setPaymentProof(null);
      clearAllQueueTokensInSession();

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
            <button type="button" className="event-payment-close" onClick={handleClose}>
              Đóng
            </button>
          </header>

          {loading && <p className="event-payment-feedback">Đang tải dữ liệu thanh toán...</p>}
          {error && !loading && <p className="event-payment-feedback event-payment-error">{error}</p>}

          {!loading && !error ? (
            bookingCompleted ? (
              <div className="event-payment-success">
                <h2>Bạn đã gửi thanh toán thành công</h2>
                <p>Mã đơn: <strong>{bookedQueueId}</strong></p>
                <p>Ghế đã đặt: <strong>{bookedSeatCodes.join(', ')}</strong></p>
                <p>Vui lòng chờ admin duyệt minh chứng để vé được xác nhận.</p>
                <div className="event-payment-action-row">
                  <button
                    type="button"
                    className="event-payment-primary"
                    onClick={() => {
                      clearAllQueueTokensInSession();
                      window.location.href = '/user';
                    }}
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
              </div>
            ) : (
              <div className="event-payment-body">
              <p className="event-payment-event">{eventDetail?.name || 'Sự kiện'}</p>

              <div className="event-payment-methods" role="group" aria-label="Chọn phương thức thanh toán">
                <button
                  type="button"
                  className={paymentMethod === 'vnpay' ? 'active' : ''}
                  onClick={() => {
                    setPaymentMethod('vnpay');
                    setCheckoutError('');
                  }}
                >
                  VNPAY
                </button>
                <button
                  type="button"
                  className={paymentMethod === 'bank' ? 'active' : ''}
                  onClick={() => {
                    setPaymentMethod('bank');
                    setCheckoutError('');
                  }}
                >
                  MB Bank
                </button>
              </div>

              {paymentMethod === 'vnpay' ? (
                <>
                  <p className="event-payment-note">Bạn sẽ được chuyển sang cổng VNPAY để thanh toán. Ghế được giữ trong thời hạn thanh toán của VNPAY.</p>

                  <div className="event-payment-vnpay-box">
                    <p><strong>Phương thức:</strong> VNPAY</p>
                    <p><strong>Trạng thái sau thanh toán:</strong> Hệ thống tự xác nhận khi VNPAY trả kết quả thành công.</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="event-payment-note">Chuyển khoản đúng nội dung bên dưới, sau đó tải ảnh minh chứng để admin duyệt thanh toán.</p>

                  <div className="event-payment-bank-box">
                    <p><strong>Ngân hàng:</strong> {BANK_TRANSFER_INFO.bankName}</p>
                    <p><strong>Số tài khoản:</strong> {BANK_TRANSFER_INFO.accountNumber}</p>
                    <p><strong>Nội dung chuyển khoản:</strong> {eventDetail?.id || eventId}-{seatIds.join(',')}</p>
                  </div>
                </>
              )}

              <div className="event-payment-summary">
                <p><strong>Ghế đã chọn:</strong> {selectedSeats.length > 0 ? selectedSeats.map(seat => seat.seatCode).join(', ') : 'Không có ghế hợp lệ'}</p>
                <p><strong>Tổng tiền:</strong> {formatVnd(selectedTotal)}</p>
                <p><strong>Cập nhật trạng thái ghế:</strong> Mỗi {SEAT_MAP_REFRESH_INTERVAL_MS / 1000} giây</p>
              </div>

              {paymentMethod === 'bank' ? (
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
              ) : null}

              {checkoutError && <p className="event-payment-feedback event-payment-error">{checkoutError}</p>}

              <button
                type="button"
                className="event-payment-primary"
                disabled={submitting || selectedSeats.length === 0}
                onClick={() => {
                  if (paymentMethod === 'vnpay') {
                    void handleVnPayCheckout();
                    return;
                  }
                  void handleBankCheckout();
                }}
              >
                {submitting
                  ? paymentMethod === 'vnpay' ? 'Đang tạo thanh toán...' : 'Đang gửi yêu cầu...'
                  : paymentMethod === 'vnpay' ? 'Thanh toán qua VNPAY' : 'Xác nhận chuyển khoản MB Bank'}
              </button>
            </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}
