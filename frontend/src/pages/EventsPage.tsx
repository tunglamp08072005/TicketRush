import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchPublicEvents, type UserEventDetail } from '../services/eventService';
import './EventsPage.css';

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

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<UserEventDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [activeStatus, setActiveStatus] = useState<UserEventDetail['status']>('ON_SALE');

  const loadEvents = async (search?: string) => {
    try {
      setLoading(true);
      const searchTerm = search?.trim();
      const data = await searchPublicEvents(searchTerm ? searchTerm : undefined);
      setEvents(data);
      setError('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể tải danh sách sự kiện');
      } else {
        setError('Không thể tải danh sách sự kiện');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesStatus = event.status === activeStatus;

      return matchesStatus;
    });
  }, [events, activeStatus]);

  const statusTabs: UserEventDetail['status'][] = ['ON_SALE', 'UPCOMING', 'ENDED'];

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadEvents(keyword);
  };

  const handleResetSearch = async () => {
    setKeyword('');
    await loadEvents();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  return (
    <main className="events-page">
      <section className="events-content">
        <header className="events-header">
          <button type="button" onClick={handleBack} className="events-back-button">
            Quay lại
          </button>
          <h1 className="events-page-title">KHÁM PHÁ SỰ KIỆN</h1>
        </header>

        <form className="events-search-wrap" onSubmit={handleSearchSubmit}>
          <label className="events-search-field" aria-label="Tìm kiếm sự kiện">
            <svg viewBox="0 0 24 24" className="events-search-icon" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm kiếm tên sự kiện, mô tả hoặc địa điểm..."
              className="events-filter-input"
            />
          </label>
          <button type="submit" className="events-search-action">Tìm</button>
          <button type="button" className="events-search-reset" onClick={handleResetSearch}>Xóa lọc</button>
        </form>

        <div className="events-state-tabs" role="tablist" aria-label="Trạng thái sự kiện">
          {statusTabs.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`events-state-tab tab-${status.toLowerCase()} ${activeStatus === status ? 'active' : ''}`}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>

        {error && <p className="events-feedback events-error">{error}</p>}
        {loading && <p className="events-feedback">Đang tải danh sách sự kiện...</p>}

        {!loading && filteredEvents.length === 0 ? (
          <div className="events-empty-state">
            <svg viewBox="0 0 64 64" className="events-empty-icon" fill="none" aria-hidden="true">
              <path d="M12 20h40l-4 24H16z" stroke="currentColor" strokeWidth="2.4" rx="3" />
              <path d="M24 20v-4a8 8 0 0 1 16 0v4" stroke="currentColor" strokeWidth="2.4" />
              <path d="m22 44 20-20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <p>Không tìm thấy sự kiện phù hợp, hãy thử tìm kiếm khác!</p>
          </div>
        ) : null}

        {!loading && filteredEvents.length > 0 ? (
          <div className="events-grid">
            {filteredEvents.map(event => (
              <article key={event.id} className="event-card">
                <img src={event.thumbnailUrl || event.heroImageUrl} alt={event.name} className="event-card-poster" />
                <div className="event-card-body">
                  <h3 className="event-card-title">{event.name}</h3>
                  <p className="event-card-meta">{formatDateTime(event.openSaleDate)}</p>
                  <p className="event-card-meta">{event.location}</p>
                  <Link to={`/events/${event.id}`} className="event-card-cta">Xem thông tin</Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
