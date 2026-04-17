import { useNavigate } from 'react-router-dom';
import { clearAuthSession } from '../utils/authStorage';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuthSession();
    navigate('/auth');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f172a' }}>
      <div style={{ background: '#111827', color: '#e5e7eb', padding: '2rem', borderRadius: '14px', width: 'min(90vw, 620px)', boxShadow: '0 16px 30px rgba(0,0,0,0.35)' }}>
        <h1>Trang Admin</h1>
        <p>Ban da dang nhap voi quyen ADMIN. Tai day co the quan ly he thong.</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={() => navigate('/')} style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', background: '#22c55e', color: '#06210f' }}>
            Ve trang chu
          </button>
          <button onClick={handleLogout} style={{ padding: '10px 14px', border: '1px solid #374151', borderRadius: '8px', background: '#0b1220', color: '#e5e7eb' }}>
            Dang xuat
          </button>
        </div>
      </div>
    </div>
  );
}
