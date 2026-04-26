import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  enterVirtualQueue,
  getVirtualQueueStatus,
  sendVirtualQueueReleaseBeacon,
  type VirtualQueueStatusResponse,
} from '../services/virtualQueueService';
import {
  clearQueueTokenInSession,
  setQueueAdmittedUntilInSession,
  getQueueTokenFromSession,
  setQueueTokenInSession,
} from '../utils/queueSessionStorage';
import './EventWaitingRoomPage.css';

const POLL_INTERVAL_MS = 3000;

type WaitingState = {
  token: string;
  position: number | null;
  batchSize: number;
  message: string;
  estimatedWaitSeconds: number | null;
  admittedUntilEpochMs: number | null;
};

function formatEta(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return 'Ngay khi đến lượt';
  }

  if (seconds < 60) {
    return `${seconds} giây`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `Khoảng ${minutes} phút`;
}

function mapToWaitingState(payload: VirtualQueueStatusResponse): WaitingState {
  return {
    token: payload.queueToken || '',
    position: payload.position,
    batchSize: payload.batchSize,
    message: payload.message,
    estimatedWaitSeconds: payload.estimatedWaitSeconds,
    admittedUntilEpochMs: payload.admittedUntilEpochMs,
  };
}

export default function EventWaitingRoomPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [waitingState, setWaitingState] = useState<WaitingState | null>(null);
  const queueTokenRef = useRef('');
  const admittedRef = useRef(false);

  const parsedEventId = Number(eventId);

  useEffect(() => {
    if (!Number.isFinite(parsedEventId)) {
      setError('Sự kiện không hợp lệ');
      setLoading(false);
      return;
    }

    let active = true;
    let timer: number | undefined;

    const onStatus = (status: VirtualQueueStatusResponse) => {
      if (!active) {
        return;
      }

      if (status.queueToken) {
        queueTokenRef.current = status.queueToken;
        setQueueTokenInSession(parsedEventId, status.queueToken);
      }
      setQueueAdmittedUntilInSession(parsedEventId, status.admittedUntilEpochMs ?? null);

      if (status.status === 'DISABLED' || status.status === 'ADMITTED') {
        admittedRef.current = true;
        navigate(`/user/events/${parsedEventId}/booking`, {
          replace: true,
          state: {
            queueToken: status.queueToken,
            admittedUntilEpochMs: status.admittedUntilEpochMs,
          },
        });
        return;
      }

      if (status.status === 'EXPIRED') {
        clearQueueTokenInSession(parsedEventId);
        queueTokenRef.current = '';
        setError('Lượt truy cập đã hết hạn. Vui lòng vào hàng chờ lại.');
        setLoading(false);
        setWaitingState(null);
        return;
      }

      setWaitingState(mapToWaitingState(status));
      setError('');
      setLoading(false);
    };

    const startPolling = (token: string) => {
      timer = window.setTimeout(() => {
        void pollStatus(token, true);
      }, POLL_INTERVAL_MS);
    };

    const pollStatus = async (token: string, allowReEnter: boolean) => {
      try {
        const status = await getVirtualQueueStatus(parsedEventId, token);
        onStatus(status);
      } catch (err) {
        if (!active) {
          return;
        }
        clearQueueTokenInSession(parsedEventId);
        queueTokenRef.current = '';
        if (allowReEnter) {
          try {
            const fresh = await enterVirtualQueue(parsedEventId);
            onStatus(fresh);
            if (fresh.queueToken && fresh.status === 'WAITING') {
              startPolling(fresh.queueToken);
            }
            return;
          } catch {
            // Fall through to show the original status failure message.
          }
        }
        setError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái phòng chờ.');
      } finally {
        if (active && queueTokenRef.current === token) {
          startPolling(token);
        }
      }
    };

    const enterQueue = async () => {
      try {
        setLoading(true);

        const existingToken = getQueueTokenFromSession(parsedEventId);
        if (existingToken) {
          queueTokenRef.current = existingToken;
          await pollStatus(existingToken, true);
          return;
        }

        const initial = await enterVirtualQueue(parsedEventId);
        onStatus(initial);

        if (initial.queueToken && initial.status === 'WAITING') {
          startPolling(initial.queueToken || '');
        }
      } catch (err) {
        if (!active) {
          return;
        }
        clearQueueTokenInSession(parsedEventId);
        setError(err instanceof Error ? err.message : 'Không thể vào phòng chờ.');
        setLoading(false);
      }
    };

    void enterQueue();

    return () => {
      active = false;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [navigate, parsedEventId]);

  useEffect(() => {
    if (!Number.isFinite(parsedEventId)) {
      return;
    }

    const handleBeforeUnload = () => {
      if (!admittedRef.current && queueTokenRef.current) {
        sendVirtualQueueReleaseBeacon(parsedEventId, queueTokenRef.current);
      }
      clearQueueTokenInSession(parsedEventId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [parsedEventId]);

  const title = useMemo(() => {
    if (!waitingState || waitingState.position == null || waitingState.position <= 0) {
      return 'Phòng chờ đang khởi tạo...';
    }
    return `Bạn đang ở vị trí thứ ${waitingState.position} trong hàng đợi`;
  }, [waitingState]);

  const handleLeaveWaitingRoom = () => {
    if (!admittedRef.current && queueTokenRef.current) {
      sendVirtualQueueReleaseBeacon(parsedEventId, queueTokenRef.current);
    }
    clearQueueTokenInSession(parsedEventId);
  };

  return (
    <main className="waiting-room-page">
      <section className="waiting-room-card">
        <p className="waiting-room-badge">Waiting Room</p>
        <h1>{title}</h1>
        <p className="waiting-room-message">
          {waitingState?.message || 'Vui lòng không tải lại trang, hệ thống sẽ tự động chuyển bạn khi đến lượt.'}
        </p>

        <div className="waiting-room-grid">
          <article>
            <span>Vị trí hiện tại</span>
            <strong>{waitingState?.position ?? '--'}</strong>
          </article>
          <article>
            <span>Batch được cấp mỗi lượt</span>
            <strong>{waitingState?.batchSize ?? '--'} người</strong>
          </article>
          <article>
            <span>Thời gian chờ ước tính</span>
            <strong>{formatEta(waitingState?.estimatedWaitSeconds ?? null)}</strong>
          </article>
        </div>

        {loading ? <p className="waiting-room-feedback">Đang đưa bạn vào phòng chờ...</p> : null}
        {error ? <p className="waiting-room-feedback waiting-room-error">{error}</p> : null}

        <div className="waiting-room-actions">
          <Link
            to="/user"
            state={{ activeMenu: 'events' }}
            className="waiting-room-link"
            onClick={handleLeaveWaitingRoom}
          >
            Quay về danh sách sự kiện
          </Link>
          {waitingState?.token ? (
            <small>Mã hàng chờ: {waitingState.token}</small>
          ) : null}
        </div>
      </section>
    </main>
  );
}
