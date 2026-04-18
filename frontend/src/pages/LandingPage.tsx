import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

type EventStatus = 'UPCOMING' | 'ON_SALE' | 'SOLD_OUT';

type EventItem = {
  title: string;
  tag: string;
  venue: string;
  img: string;
  status: EventStatus;
  saleLabel: string;
  remainingPercent: number;
  remainingText: string;
};

const featuredEvents: EventItem[] = [
  {
    title: 'Skyline Music Fest 2026',
    tag: 'EDM • Liveshow ngoài trời',
    venue: 'SVĐ Thống Nhất, TP.HCM',
    img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    status: 'UPCOMING',
    saleLabel: 'Mở bán sau 02:15:30',
    remainingPercent: 100,
    remainingText: 'Mở bán giới hạn 8.000 vé'
  },
  {
    title: 'Noi Nay Co Anh Tour',
    tag: 'Pop • Concert Arena',
    venue: 'Nhà thi đấu Quân khu 7',
    img: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80',
    status: 'ON_SALE',
    saleLabel: 'Đang mở bán',
    remainingPercent: 5,
    remainingText: 'Sắp sold out - còn lại 5%'
  },
  {
    title: 'Indie Pulse Night',
    tag: 'Indie • Club Show',
    venue: 'The Observatory, TP.HCM',
    img: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
    status: 'ON_SALE',
    saleLabel: 'Đang mở bán',
    remainingPercent: 38,
    remainingText: 'Còn lại 38% vé khu Standing'
  },
  {
    title: 'Legend Band Reunion',
    tag: 'Rock • Stadium Tour',
    venue: 'Sân vận động Mỹ Đình',
    img: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80',
    status: 'SOLD_OUT',
    saleLabel: 'Đã bán hết',
    remainingPercent: 0,
    remainingText: 'Sold out trong 11 phút'
  }
];

const benefits = [
  { icon: '⚡', title: 'Flash Sale theo giây', description: 'Giữ vé ngay khi mở bán với tốc độ phản hồi tức thì và hạn chế trễ lệnh.' },
  { icon: '💺', title: 'Sơ đồ ghế trực quan', description: 'Theo dõi khu vực ghế theo thời gian thực, thấy ngay khu hot đang được săn.' },
  { icon: '🎵', title: 'Trải nghiệm âm nhạc trọn vẹn', description: 'Tổng hợp concert, liveshow, fanmeeting và ưu đãi độc quyền cho cộng đồng fan.' }
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<EventStatus>('ON_SALE');

  const tabs: Array<{ label: string; value: EventStatus }> = [
    { label: 'Sắp mở bán', value: 'UPCOMING' },
    { label: 'Đang mở bán', value: 'ON_SALE' },
    { label: 'Đã kết thúc', value: 'SOLD_OUT' }
  ];

  const filteredEvents = useMemo(
    () => featuredEvents.filter((event) => event.status === activeTab),
    [activeTab]
  );

  const statusClassMap: Record<EventStatus, string> = {
    UPCOMING: 'status-upcoming',
    ON_SALE: 'status-onsale',
    SOLD_OUT: 'status-soldout'
  };

  const actionLabelMap: Record<EventStatus, string> = {
    UPCOMING: 'Nhắc tôi khi mở bán',
    ON_SALE: 'Đặt vé ngay',
    SOLD_OUT: 'Đã sold out'
  };

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-hero-overlay" />
        <header className="landing-header">
          <div className="landing-header-inner">
            <div className="landing-logo-wrap">
              <div className="landing-logo">TICKETRUSH</div>
              <span className="landing-divider" aria-hidden="true" />
            </div>
            <nav className="landing-nav">
              <Link to="/">Trang chủ</Link>
              <a href="#showing">Sự kiện</a>
              <Link to="/auth" className="landing-cta">Đăng ký/Đăng nhập</Link>
            </nav>
          </div>
        </header>

        <div className="landing-shell">
          <div className="landing-hero-copy">
            <div className="hero-glass-card">
              <span className="landing-hero-badge">Nền tảng săn vé flash sale số 1</span>
              <h1 className="landing-hero-title">
                <span>Săn vé nhanh chóng</span>
                <span>Bùng nổ cùng thần tượng</span>
              </h1>
              <p className="landing-hero-text">
                Chớp thời điểm mở bán concert và liveshow. Sơ đồ ghế trực quan, cảnh báo sold out theo thời gian thực
              </p>

              <div className="landing-hero-actions">
                <Link to="/auth" className="landing-btn landing-btn-primary">Săn vé ngay</Link>
                <a href="#showing" className="landing-btn landing-btn-secondary">Lịch trình sự kiện</a>
              </div>
            </div>
          </div>
        </div>

      </section>

      <section id="showing" className="now-showing">
        <div className="section-headline">
          <span>Sự kiện nổi bật</span>
        </div>

        <div className="event-tabs" role="tablist" aria-label="Trạng thái sự kiện">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`event-tab ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="movie-grid">
          {filteredEvents.map((event) => (
            <article key={event.title} className="movie-card">
              <img src={event.img} alt={event.title} />
              <div className="movie-card-info">
                <span className={`event-status ${statusClassMap[event.status]}`}>
                  {event.saleLabel}
                </span>
                <div className="event-main-copy">
                  <h3>{event.title}</h3>
                  <p>{event.tag}</p>
                  <p className="event-venue">{event.venue}</p>
                </div>
                {event.status === 'UPCOMING' ? (
                  <div className="event-countdown">Mở bán sau 02:15:30</div>
                ) : null}

                <div className="ticket-progress-wrap" aria-label="Tiến độ vé">
                  <div className="ticket-progress-track">
                    <span
                      className={`ticket-progress-fill ${statusClassMap[event.status]}`}
                      style={{ width: `${event.remainingPercent}%` }}
                    />
                  </div>
                  <p>{event.remainingText}</p>
                </div>

                <button className="movie-btn" disabled={event.status === 'SOLD_OUT'}>
                  {actionLabelMap[event.status]}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="why" className="landing-features">
        <div className="feature-grid">
          {benefits.map((item) => (
            <div key={item.title} className="feature-card">
              <div className="feature-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
