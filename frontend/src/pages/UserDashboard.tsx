import { useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthSession } from '../utils/authStorage';

export default function UserDashboard() {
  const navigate = useNavigate();
  const username = getAuthSession().username || 'User';

  const handleLogout = () => {
    clearAuthSession();
    navigate('/auth');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f7fb' }}>
      <div style={{ background: '#fff', padding: '2rem', borderRadius: '14px', width: 'min(90vw, 560px)', boxShadow: '0 12px 24px rgba(0,0,0,0.08)' }}>
        <h1>Trang User</h1>
        <p>Xin chao {username}, ban da dang nhap voi quyen USER.</p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button onClick={() => navigate('/')} style={{ padding: '10px 14px', border: 'none', borderRadius: '8px', background: '#1f6feb', color: '#fff' }}>
            Ve trang chu
          </button>
          <button onClick={handleLogout} style={{ padding: '10px 14px', border: '1px solid #d0d7de', borderRadius: '8px', background: '#fff' }}>
            Dang xuat
          </button>
        </div>
      </div>
    </div>
  );
}
