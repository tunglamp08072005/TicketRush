import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getAuthSession } from '../../auth/utils/authStorage';
import { checkoutPayment } from '../../order-payment/services/paymentService';
import { getPendingReservations, removePendingReservation } from '../../order-payment/services/pendingReservationService';
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

function formatVnd(value: number): string {
  return `${value.toLocaleString('vi-VN')}Ä‘`;
}

const BANK_TRANSFER_INFO = {
  bankName: 'MB Bank',
  accountNumber: '0359547917',
};
const HEARTBEAT_INTERVAL_MS = 30000;

function redirectToEventListWithHardReload(): void {
  clearAllQueueTokensInSession();
  window.location.href = '/user';
}
const SEAT_MAP_REFRESH_INTERVAL_MS = 5000;

export default function EventPaymentPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const parsedEventId = Number(eventId);
  const location = useLocation();
  const { token } = getAuthSession();
  const {
    seatIds: seatIdsFromState = [],
    reservationId,
    queueToken: queueTokenFromState,
  } = (location.state as PaymentLocationState) || {};
  const queueToken = queueTokenFromState || getQueueTokenFromSession(parsedEventId);
  const pendingReservation = useMemo(
    () => (reservationId ? getPendingReservations().find(item => item.id === reservationId) ?? null : null),
    [reservationId],
  );
  const seatIds = useMemo(
    () => (Array.isArray(seatIdsFromState) && seatIdsFromState.length > 0 ? seatIdsFromState : pendingReservation?.seatIds ?? []),
    [pendingReservation?.seatIds, seatIdsFromState],
  );

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

    const id = Number(eventId);
    if (Number.isFinite(id) && !queueToken && !bookingCompleted) {
      setError('PhiĂªn vĂ o cá»•ng Ä‘Ă£ háº¿t hoáº·c bá»‹ máº¥t. Vui lĂ²ng vĂ o láº¡i phĂ²ng chá» Ä‘á»ƒ tiáº¿p tá»¥c thanh toĂ¡n.');
      navigate(`/user/events/${id}/waiting-room`, { replace: true });
      return;
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      navigate(`/user/events/${eventId}/booking`, { replace: true });
      return;
    }

    if (!Number.isFinite(id)) {
      setError('Sá»± kiá»‡n khĂ´ng há»£p lá»‡');
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
          setError(err.message || 'KhĂ´ng thá»ƒ táº£i dá»¯ liá»‡u thanh toĂ¡n');
        } else {
          setError('KhĂ´ng thá»ƒ táº£i dá»¯ liá»‡u thanh toĂ¡n');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [bookingCompleted, eventId, navigate, queueToken, seatIds, token]);

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

  const handleCheckout = async () => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      setCheckoutError('Sá»± kiá»‡n khĂ´ng há»£p lá»‡');
      return;
    }

    if (!paymentProof) {
      setCheckoutError('Vui lĂ²ng táº£i lĂªn áº£nh minh chá»©ng thanh toĂ¡n.');
      return;
    }

    if (!queueToken) {
      setCheckoutError('KhĂ´ng tĂ¬m tháº¥y queue token há»£p lá»‡. Vui lĂ²ng vĂ o láº¡i phĂ²ng chá» vĂ  thá»­ láº¡i.');
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
        setCheckoutError(err.message || 'KhĂ´ng thá»ƒ táº¡o Ä‘Æ¡n thanh toĂ¡n');
      } else {
        setCheckoutError('KhĂ´ng thá»ƒ táº¡o Ä‘Æ¡n thanh toĂ¡n');
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
            <h1>Thanh toĂ¡n Ä‘áº·t gháº¿</h1>
            {!bookingCompleted ? (
              <button type="button" className="event-payment-close" onClick={handleClose}>
                ÄĂ³ng
              </button>
            ) : null}
          </header>

          {loading && <p className="event-payment-feedback">Äang táº£i dá»¯ liá»‡u thanh toĂ¡n...</p>}
          {error && !loading && <p className="event-payment-feedback event-payment-error">{error}</p>}

          {!loading && !error ? (
            bookingCompleted ? (
              <div className="event-payment-success">
                <h2>Báº¡n Ä‘Ă£ Ä‘áº·t gháº¿ thĂ nh cĂ´ng</h2>
                <p>MĂ£ Ä‘Æ¡n: <strong>{bookedQueueId}</strong></p>
                <p>Gháº¿ Ä‘Ă£ Ä‘áº·t: <strong>{bookedSeatCodes.join(', ')}</strong></p>
                <p>Vui lĂ²ng chá» admin duyá»‡t thanh toĂ¡n Ä‘á»ƒ vĂ© Ä‘Æ°á»£c xĂ¡c nháº­n.</p>
                <button
                  type="button"
                  className="event-payment-primary"
                  onClick={redirectToEventListWithHardReload}
                >
                  Vá» danh sĂ¡ch sá»± kiá»‡n
                </button>
                <button
                  type="button"
                  className="event-payment-primary"
                  onClick={() => navigate('/user', { state: { activeMenu: 'payments' } })}
                >
                  Vá» má»¥c thanh toĂ¡n
                </button>
              </div>
            ) : (
              <div className="event-payment-body">
                <p className="event-payment-event">{eventDetail?.name || 'Sá»± kiá»‡n'}</p>
                <p className="event-payment-note">Báº¡n cĂ³ thá»ƒ Ä‘Ă³ng bÆ°á»›c thanh toĂ¡n báº±ng nĂºt ÄĂ³ng. Náº¿u chÆ°a xĂ¡c nháº­n, dá»¯ liá»‡u sáº½ khĂ´ng Ä‘Æ°á»£c lÆ°u.</p>

                <div className="event-payment-bank-box">
                  <p><strong>NgĂ¢n hĂ ng:</strong> {BANK_TRANSFER_INFO.bankName}</p>
                  <p><strong>Sá»‘ tĂ i khoáº£n:</strong> {BANK_TRANSFER_INFO.accountNumber}</p>
                  <p><strong>Ná»™i dung chuyá»ƒn khoáº£n:</strong> {eventDetail?.id || eventId}-{seatIds.join(',')}</p>
                </div>

                <div className="event-payment-summary">
                  <p><strong>Gháº¿ Ä‘Ă£ chá»n:</strong> {selectedSeats.length > 0 ? selectedSeats.map(seat => seat.seatCode).join(', ') : 'KhĂ´ng cĂ³ gháº¿ há»£p lá»‡'}</p>
                  <p><strong>Tá»•ng tiá»n:</strong> {formatVnd(selectedTotal)}</p>
                  <p><strong>Cáº­p nháº­t tráº¡ng thĂ¡i gháº¿:</strong> Má»—i {SEAT_MAP_REFRESH_INTERVAL_MS / 1000} giĂ¢y</p>
                </div>

                <label className="event-payment-upload" htmlFor="paymentProof">
                  Minh chá»©ng thanh toĂ¡n
                  <input
                    id="paymentProof"
                    type="file"
                    accept="image/*"
                    onChange={event => setPaymentProof(event.target.files?.[0] ?? null)}
                  />
                  <span>{paymentProof ? paymentProof.name : 'ChÆ°a chá»n áº£nh'}</span>
                </label>

                {checkoutError && <p className="event-payment-feedback event-payment-error">{checkoutError}</p>}

                <button
                  type="button"
                  className="event-payment-primary"
                  disabled={submitting || selectedSeats.length === 0}
                  onClick={() => void handleCheckout()}
                >
                  {submitting ? 'Äang gá»­i yĂªu cáº§u...' : 'XĂ¡c nháº­n thanh toĂ¡n'}
                </button>
              </div>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}

