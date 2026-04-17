import React from 'react';
import './LandingPage.css';

// --- MOCK DATA ---
const mockMovies = [
  { id: 1, title: 'Avenger: Endgame', genre: 'Hành động, Viễn tưởng', poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=500&q=80' },
  { id: 2, title: 'Inception', genre: 'Tâm lý, Viễn tưởng', poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80' },
  { id: 3, title: 'The Dark Knight', genre: 'Hành động, Tội phạm', poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=500&q=80' },
  { id: 4, title: 'Interstellar', genre: 'Khoa học viễn tưởng', poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=500&q=80' }
];

// --- COMPONENTS ---

const Navbar = () => (
  <nav className="lp-navbar">
    <div className="lp-nav-brand">TicketRush</div>
    <ul className="lp-nav-menu">
      <li><a href="#home">Trang chủ</a></li>
      <li><a href="#movies">Phim</a></li>
      <li><a href="#cinemas">Rạp</a></li>
    </ul>
    <div className="lp-nav-auth">
      <button className="btn-ghost">Đăng nhập</button>
      <button className="btn-primary">Đăng ký</button>
    </div>
  </nav>
);

const HeroSection = () => (
  <header className="lp-hero" id="home">
    <div className="lp-hero-overlay"></div>
    <div className="lp-hero-content">
      <h1>Đặt vé mọi rạp phim.<br />Trải nghiệm điện ảnh đỉnh cao.</h1>
      <p>Nền tảng đặt vé phim tối ưu, nhanh chóng, ưu đãi hấp dẫn cho mọi thành viên.</p>
      <div className="lp-hero-actions">
        <button className="btn-primary btn-large">Đăng ký ngay</button>
        <button className="btn-outline btn-large">Tìm hiểu thêm</button>
      </div>
    </div>
  </header>
);

const MovieCard = ({ movie, onBookTicket }) => (
  <div className="lp-movie-card">
    <div className="lp-card-img-wrapper">
      <img src={movie.poster} alt={movie.title} />
      <div className="lp-card-hover">
        <button className="btn-primary" onClick={onBookTicket}>Đặt vé ngay</button>
        <button className="btn-outline">Xem chi tiết</button>
      </div>
    </div>
    <div className="lp-card-info">
      <h3>{movie.title}</h3>
      <p>{movie.genre}</p>
    </div>
  </div>
);

const BenefitsSection = () => (
  <section className="lp-benefits">
    <h2>Tại sao chọn TicketRush?</h2>
    <div className="lp-benefits-grid">
      <div className="lp-benefit-item">
        <h3>⚡ Đặt vé siêu tốc</h3>
        <p>Chỉ với 3 bước đơn giản, giữ chỗ ngay lập tức không cần xếp hàng.</p>
      </div>
      <div className="lp-benefit-item">
        <h3>💺 Chọn ghế dễ dàng</h3>
        <p>Sơ đồ rạp trực quan, cập nhật ghế trống theo thời gian thực.</p>
      </div>
      <div className="lp-benefit-item">
        <h3>💳 Thanh toán tiện lợi</h3>
        <p>Hỗ trợ đa dạng phương thức: VNPay, Momo, thẻ tín dụng an toàn.</p>
      </div>
      <div className="lp-benefit-item">
        <h3>🎁 Ưu đãi ngập tràn</h3>
        <p>Tích điểm đổi vé, nhận voucher sinh nhật và hàng ngàn khuyến mãi.</p>
      </div>
    </div>
  </section>
);

const CallToAction = () => (
  <section className="lp-bottom-cta">
    <h2>Sẵn sàng hòa mình vào thế giới điện ảnh?</h2>
    <p>Đăng ký ngay hôm nay để nhận voucher giảm 50% cho vé đầu tiên.</p>
    <button className="btn-primary btn-large">Tạo tài khoản miễn phí</button>
  </section>
);

const Footer = () => (
  <footer className="lp-footer">
    <div className="lp-footer-content">
      <div className="lp-footer-brand">
        <h2>TicketRush</h2>
        <p>Hệ thống đặt vé xem phim trực tuyến hàng đầu.</p>
      </div>
      <div className="lp-footer-links">
        <a href="#terms">Điều khoản sử dụng</a>
        <a href="#privacy">Chính sách bảo mật</a>
        <a href="#contact">Liên hệ: support@ticketrush.vn</a>
      </div>
    </div>
    <div className="lp-footer-bottom">
      <p>&copy; 2026 TicketRush. All rights reserved.</p>
    </div>
  </footer>
);

// --- MAIN PAGE COMPONENT ---
export default function LandingPage() {
  const handleBooking = () => {
    // Logic yêu cầu đăng nhập khi user click "Đặt vé"
    alert("Vui lòng đăng nhập hoặc tạo tài khoản để tiếp tục đặt vé!");
    // window.location.href = '/login'; // Code thực tế sẽ redirect
  };

  return (
    <div className="lp-container">
      <Navbar />
      <HeroSection />
      
      <section className="lp-movies-section" id="movies">
        <h2 className="section-title">Phim Đang Hot</h2>
        <div className="lp-movie-grid">
          {mockMovies.map(movie => (
            <MovieCard 
              key={movie.id} 
              movie={movie} 
              onBookTicket={handleBooking} 
            />
          ))}
        </div>
      </section>

      <BenefitsSection />
      <CallToAction />
      <Footer />
    </div>
  );
}