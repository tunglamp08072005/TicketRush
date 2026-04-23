import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getPublicEventDetail, type UserEventDetail } from '../services/eventService';
import './EventDetailPage.css';

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

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [eventDetail, setEventDetail] = useState<UserEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = Number(eventId);
    if (!Number.isFinite(id)) {
      setError('Sự kiện không hợp lệ');
      setLoading(false);
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

    void loadDetail();
  }, [eventId]);

  const zoneCount = useMemo(() => eventDetail?.zones?.length ?? 0, [eventDetail]);

  const handleBack = () => {
    navigate('/events');
  };


  return (
    <main className="event-detail-page">
      <section className="event-detail-content">
        <button
          type="button"
          className="event-detail-back"
          onClick={handleBack}
        >
          Quay lại
        </button>

        {loading && <p className="event-detail-feedback">Đang tải thông tin sự kiện...</p>}
        {error && !loading && <p className="event-detail-feedback event-detail-error">{error}</p>}

        {!loading && !error && eventDetail ? (
          <div className="event-detail-overlay" onClick={handleBack} role="button" tabIndex={-1}>
            <article className="event-detail-card" onClick={event => event.stopPropagation()}>
              <img
                src={eventDetail.heroImageUrl || eventDetail.thumbnailUrl}
                alt={eventDetail.name}
                className="event-detail-hero"
              />

              <div className="event-detail-body">
                <div className="event-detail-title-row">
                  <h1>{eventDetail.name}</h1>
                  <span className="event-detail-status">{statusLabel(eventDetail.status)}</span>
                </div>

                <p className="event-detail-description">{eventDetail.description}</p>

                <div className="event-detail-grid">
                  <p><strong>Địa điểm:</strong> {eventDetail.location}</p>
                  <p><strong>Mở bán:</strong> {formatDateTime(eventDetail.openSaleDate)}</p>
                  <p><strong>Thời gian diễn ra:</strong> {formatDateTime(eventDetail.eventStartDate)}</p>
                  <p><strong>Tổng số ghế:</strong> {eventDetail.totalSeatCount.toLocaleString('vi-VN')}</p>
                  <p><strong>Số khu vực:</strong> {zoneCount}</p>
                </div>

                <div className="event-detail-actions">
                  <Link to={`/events/${eventDetail.id}/booking`} className="event-detail-primary">Đặt ghế ngay</Link>
                </div>
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}