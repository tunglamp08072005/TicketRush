import { Link } from 'react-router-dom';
import './LandingPage.css';

const benefits = [
  { icon: '⚡', title: 'Flash Sale theo giây', description: 'Giữ vé ngay khi mở bán với tốc độ phản hồi tức thì và hạn chế trễ lệnh.' },
  { icon: '💺', title: 'Sơ đồ ghế trực quan', description: 'Theo dõi khu vực ghế theo thời gian thực, thấy ngay khu hot đang được săn.' },
  { icon: '🎵', title: 'Trải nghiệm âm nhạc trọn vẹn', description: 'Tổng hợp concert, liveshow, fanmeeting và ưu đãi độc quyền cho cộng đồng fan.' }
];

export default function LandingPage() {
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
              <Link to="/" className="landing-nav-link">Trang chủ</Link>
              <Link to="/events" className="landing-nav-link">Sự kiện</Link>
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
                <Link to="/events" className="landing-btn landing-btn-secondary">Xem trang sự kiện</Link>
              </div>
            </div>
          </div>
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
