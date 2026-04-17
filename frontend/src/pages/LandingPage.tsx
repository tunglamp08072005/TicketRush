import { Link } from 'react-router-dom';
import './LandingPage.css';

const nowShowing = [
  {
    title: 'Bóng Ma Rạp Chiếu',
    tag: 'Hành động • 2026',
    img: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=900&q=80',
    rating: '4.8'
  },
  {
    title: 'Ánh Đèn Thành Phố',
    tag: 'Lãng mạn • 2025',
    img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    rating: '4.5'
  },
  {
    title: 'Nữ Tu Bóng Tối',
    tag: 'Kinh dị • 2026',
    img: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=900&q=80',
    rating: '4.7'
  },
  {
    title: 'Cuộc Chiến Đỉnh Cao',
    tag: 'Phiêu lưu • 2025',
    img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
    rating: '4.6'
  }
];

const benefits = [
  { icon: '⚡', title: 'Nhanh chóng & linh hoạt', description: 'Đặt vé và chọn ghế chỉ trong vài giây với giao diện tối ưu.' },
  { icon: '🛡️', title: 'Bảo mật tuyệt đối', description: 'Dữ liệu khách hàng và thanh toán được bảo vệ an toàn.' },
  { icon: '🎁', title: 'Ưu đãi thành viên', description: 'Combo, khuyến mãi và mã giảm giá độc quyền cho bạn.' }
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-logo">TicketRush</div>
        <nav className="landing-nav">
          <Link to="/">Trang chủ</Link>
          <Link to="/#showing">Phim</Link>
          <Link to="/auth" className="landing-cta">Đăng nhập / Đăng ký</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-overlay" />
        <div className="landing-hero-copy">
          <span className="landing-hero-badge">Nền tảng đặt vé phim B2C</span>
          <h1 className="landing-hero-title">Mua vé nhanh chóng, trải nghiệm điện ảnh kịch tính.</h1>
          <p className="landing-hero-text">
            TicketRush biến buổi xem phim của bạn trở nên đẳng cấp hơn với trải nghiệm đặt vé online mượt mà, chọn chỗ ưu tiên và thiết kế theo phong cách rạp chiếu chuyên nghiệp.
          </p>
          <div className="landing-hero-actions">
            <Link to="/auth" className="landing-btn landing-btn-primary">Mua ngay</Link>
            <a href="#showing" className="landing-btn landing-btn-secondary">Xem phim đang chiếu</a>
          </div>
        </div>

      </section>

      <section id="showing" className="now-showing">
        <div className="section-headline">
          <span>Phim đang chiếu</span>
        </div>
        <div className="movie-grid">
          {nowShowing.map((movie) => (
            <article key={movie.title} className="movie-card">
              <img src={movie.img} alt={movie.title} />
              <div className="movie-card-info">
                <div>
                  <h3>{movie.title}</h3>
                  <p>{movie.tag}</p>
                </div>
                <button className="movie-btn">Đặt vé</button>
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
