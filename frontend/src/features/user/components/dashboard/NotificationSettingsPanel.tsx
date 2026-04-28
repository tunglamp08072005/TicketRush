import { useEffect, useState, useCallback } from 'react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../services/notificationPreferenceService';

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M22 4 12 13 2 4" />
    </svg>
  );
}

function BellSystemIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M15 18H5.8c-.7 0-1.1-.8-.7-1.3l1.1-1.4a4 4 0 0 0 .8-2.5V10a5 5 0 0 1 10 0v2.8c0 .9.3 1.8.8 2.5l1.1 1.4c.4.5 0 1.3-.7 1.3H15Z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
      <circle cx="18" cy="5" r="3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ id, checked, disabled = false, onChange }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        width: '52px',
        height: '28px',
        borderRadius: '14px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
        background: checked
          ? 'linear-gradient(135deg, #f97316, #ef4444)'
          : '#374151',
        boxShadow: checked
          ? '0 0 16px rgba(249, 115, 22, 0.45), inset 0 1px 2px rgba(0,0,0,0.1)'
          : 'inset 0 1px 3px rgba(0,0,0,0.3)',
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '26px' : '3px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s ease',
          transform: disabled ? 'scale(1)' : 'scale(1)',
        }}
      />
    </button>
  );
}

interface NotificationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  toggleId: string;
  checked: boolean;
  saving: boolean;
  onToggle: (checked: boolean) => void;
  accentColor: string;
}

function NotificationCard({
  icon,
  title,
  description,
  toggleId,
  checked,
  saving,
  onToggle,
  accentColor,
}: NotificationCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '20px',
        border: `1px solid ${checked ? `${accentColor}30` : '#374151'}`,
        background: checked
          ? `linear-gradient(135deg, ${accentColor}08, ${accentColor}04)`
          : 'rgba(17, 24, 39, 0.6)',
        backdropFilter: 'blur(12px)',
        padding: '24px',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
      }}
    >
      {/* Glow effect when enabled */}
      {checked && (
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accentColor}15, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
          {/* Icon container */}
          <div
            style={{
              flexShrink: 0,
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: checked
                ? `linear-gradient(135deg, ${accentColor}25, ${accentColor}10)`
                : 'rgba(55, 65, 81, 0.5)',
              border: `1px solid ${checked ? `${accentColor}30` : '#4b5563'}`,
              color: checked ? accentColor : '#9ca3af',
              transition: 'all 0.4s ease',
            }}
          >
            {icon}
          </div>

          {/* Text content */}
          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: checked ? '#f9fafb' : '#d1d5db',
                transition: 'color 0.3s ease',
                lineHeight: 1.4,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: '13px',
                color: '#9ca3af',
                lineHeight: 1.6,
              }}
            >
              {description}
            </p>

            {/* Status badge */}
            <div style={{ marginTop: '12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: checked ? `${accentColor}15` : 'rgba(107, 114, 128, 0.15)',
                  color: checked ? accentColor : '#6b7280',
                  border: `1px solid ${checked ? `${accentColor}25` : '#4b556322'}`,
                  transition: 'all 0.3s ease',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: checked ? accentColor : '#6b7280',
                    boxShadow: checked ? `0 0 8px ${accentColor}60` : 'none',
                    transition: 'all 0.3s ease',
                  }}
                />
                {saving ? 'Đang lưu...' : checked ? 'Đang bật' : 'Đã tắt'}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <ToggleSwitch
          id={toggleId}
          checked={checked}
          disabled={saving}
          onChange={onToggle}
        />
      </div>
    </div>
  );
}

export default function NotificationSettingsPanel() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotificationEnabled: true,
    systemNotificationEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingSystem, setSavingSystem] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const data = await getNotificationPreferences();
        setPreferences(data);
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải cài đặt thông báo');
        } else {
          setError('Không thể tải cài đặt thông báo');
        }
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const showSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    const timer = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleEmailToggle = async (checked: boolean) => {
    setSavingEmail(true);
    setError('');
    try {
      const updated = await updateNotificationPreferences({ emailNotificationEnabled: checked });
      setPreferences(updated);
      showSuccess(checked ? 'Đã bật thông báo email' : 'Đã tắt thông báo email');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể cập nhật cài đặt');
      } else {
        setError('Không thể cập nhật cài đặt');
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSystemToggle = async (checked: boolean) => {
    setSavingSystem(true);
    setError('');
    try {
      const updated = await updateNotificationPreferences({ systemNotificationEnabled: checked });
      setPreferences(updated);
      showSuccess(checked ? 'Đã bật thông báo hệ thống' : 'Đã tắt thông báo hệ thống');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể cập nhật cài đặt');
      } else {
        setError('Không thể cập nhật cài đặt');
      }
    } finally {
      setSavingSystem(false);
    }
  };

  if (loading) {
    return (
      <section
        style={{
          borderRadius: '20px',
          border: '1px solid #1f2937',
          background: 'rgba(17, 24, 39, 0.7)',
          padding: '32px',
          color: '#d1d5db',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid #374151',
            borderTopColor: '#f97316',
            borderRadius: '50%',
            animation: 'notification-spin 0.8s linear infinite',
          }}
        />
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Đang tải cài đặt thông báo...</p>
        <style>{`@keyframes notification-spin { to { transform: rotate(360deg); } }`}</style>
      </section>
    );
  }

  return (
    <section
      style={{
        minHeight: '100%',
        background: 'transparent',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: 700,
            color: '#f9fafb',
            lineHeight: 1.3,
          }}
        >
          Cài đặt thông báo
        </h2>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '14px',
            color: '#9ca3af',
            lineHeight: 1.6,
          }}
        >
          Quản lý cách bạn nhận thông báo từ TicketRush. Mỗi kênh thông báo hoạt động độc lập.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.08)',
            fontSize: '13px',
            color: '#fca5a5',
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            background: 'rgba(16, 185, 129, 0.08)',
            fontSize: '13px',
            color: '#6ee7b7',
            animation: 'notification-fade-in 0.3s ease',
          }}
        >
          ✓ {successMessage}
          <style>{`@keyframes notification-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      )}

      {/* Notification toggle cards */}
      <div style={{ display: 'grid', gap: '16px' }}>
        <NotificationCard
          icon={<EmailIcon />}
          title="Thông báo Email"
          description="Nhận thông báo qua email về sự kiện sắp diễn ra, cập nhật trạng thái vé, xác nhận thanh toán và các ưu đãi đặc biệt từ TicketRush."
          toggleId="toggle-email-notification"
          checked={preferences.emailNotificationEnabled}
          saving={savingEmail}
          onToggle={handleEmailToggle}
          accentColor="#f97316"
        />

        <NotificationCard
          icon={<BellSystemIcon />}
          title="Thông báo hệ thống TicketRush"
          description="Nhận thông báo trực tiếp trên trang web TicketRush về phản hồi thanh toán, cập nhật đơn hàng, nhắc nhở sự kiện và tin tức mới nhất."
          toggleId="toggle-system-notification"
          checked={preferences.systemNotificationEnabled}
          saving={savingSystem}
          onToggle={handleSystemToggle}
          accentColor="#8b5cf6"
        />
      </div>

      {/* Info card */}
      <div
        style={{
          marginTop: '24px',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          background: 'rgba(59, 130, 246, 0.05)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', flexShrink: 0, marginTop: '1px' }} fill="none" stroke="#60a5fa" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#93c5fd', fontWeight: 600 }}>
              Lưu ý quan trọng
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9ca3af', lineHeight: 1.7 }}>
              Hai kênh thông báo hoạt động hoàn toàn độc lập. Bạn có thể tắt email mà vẫn nhận thông báo trên hệ thống, hoặc ngược lại. Thay đổi được lưu tự động ngay khi bạn bật/tắt.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
