import { Link } from 'react-router-dom';
import GuestHeader from '../../../components/guest/GuestHeader';
import './LandingPage.css';

const benefits = [
  { 
    icon: '⚡', 
    title: 'Flash Sale theo giây', 
    description: 'Giữ vé ngay khi mở bán với tốc độ phản hồi tức thì và hạn chế trễ lệnh.',
    color: '#FF6B6B'
  },
  { 
    icon: '💺', 
    title: 'Sơ đồ ghế trực quan', 
    description: 'Theo dõi khu vực ghế theo thời gian thực, thấy ngay khu hot đang được săn.',
    color: '#00D9FF'
  },
  { 
    icon: '🎵', 
    title: 'Trải nghiệm âm nhạc trọn vẹn', 
    description: 'Tổng hợp concert, liveshow, fanmeeting và ưu đãi độc quyền cho cộng đồng fan.',
    color: '#A78BFA'
  }
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="animated-bg" />
      
      <div className="particles">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      <GuestHeader activeTab="home" />
      
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge animate-text animate-text-delay-1">
            <span className="badge-dot" />
            Nền tảng săn vé flash sale số 1
          </div>
          
          <h1 className="hero-title">
            <span className="animate-text animate-text-delay-2">Săn vé nhanh chóng</span>
            <span className="hero-title-accent animate-text animate-text-delay-3">Bùng nổ cùng thần tượng</span>
          </h1>
          
          <p className="hero-description animate-text animate-text-delay-4">
            Chớp thời điểm mở bán concert và liveshow. Sơ đồ ghế trực quan, 
            cảnh báo sold out theo thời gian thực. Không bỏ lỡ khoảnh khắc nào!
          </p>

          <div className="hero-actions animate-text animate-text-delay-5">
            <Link to="/auth" className="btn-hero-primary">
              <span className="btn-icon">🎫</span>
              Săn vé ngay
            </Link>
            <Link to="/events" className="btn-hero-secondary">
              Khám phá sự kiện
              <span className="btn-arrow">→</span>
            </Link>
          </div>

          <div className="hero-stats animate-text animate-text-delay-5">
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Vé đã bán</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">200+</span>
              <span className="stat-label">Sự kiện</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-number">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="floating-card card-1">
            <div className="card-glow" />
            <div className="card-content">
              <span className="card-icon">🎤</span>
              <span className="card-text">Live Concert 2026</span>
              <span className="card-badge">HOT</span>
            </div>
          </div>
          
          <div className="floating-card card-2">
            <div className="card-glow" />
            <div className="card-content">
              <span className="card-icon">🎭</span>
              <span className="card-text">Music Festival</span>
              <span className="card-badge featured">FEATURED</span>
            </div>
          </div>
          
          <div className="floating-card card-3">
            <div className="card-glow" />
            <div className="card-content">
              <span className="card-icon">⚡</span>
              <span className="card-text">Flash Sale Active</span>
              <span className="card-badge urgent">LIVE</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="features-header">
          <h2 className="features-title">
            <span className="gradient-text">Tại sao chọn TicketRush?</span>
          </h2>
          <p className="features-subtitle">
            Nền tảng đặt vé hàng đầu Việt Nam với công nghệ tiên tiến nhất
          </p>
        </div>

        <div className="feature-grid">
          {benefits.map((item) => (
            <div 
              key={item.title} 
              className="feature-card card-3d"
              style={{ '--accent-color': item.color } as React.CSSProperties}
            >
              <div className="feature-glow" />
              <div className="feature-icon-wrap">
                <span className="feature-icon">{item.icon}</span>
              </div>
              <h3 className="feature-title">{item.title}</h3>
              <p className="feature-description">{item.description}</p>
              <div className="feature-footer">
                <span className="feature-link">
                  Tìm hiểu thêm 
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div className="cta-content">
          <h2>Sẵn sàng săn vé?</h2>
          <p>Đăng ký ngay hôm nay và không bỏ lỡ bất kỳ sự kiện nào!</p>
          <Link to="/auth" className="btn-cta">
            Bắt đầu ngay
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="cta-decoration">
          <div className="cta-ring ring-1" />
          <div className="cta-ring ring-2" />
          <div className="cta-ring ring-3" />
        </div>
      </section>
    </div>
  );
}
