import { useEffect, useState, useCallback } from 'react';
import { Mail, BellRing, Info, ShieldCheck } from 'lucide-react';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../services/notificationPreferenceService';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  accentColorClass?: string;
}

function ToggleSwitch({ id, checked, disabled = false, onChange, accentColorClass = 'bg-gradient-to-r from-orange-500 to-red-500' }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[28px] w-[52px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${
        checked
          ? `${accentColorClass} shadow-[0_0_12px_rgba(249,115,22,0.4)]`
          : 'bg-white/10 hover:bg-white/20'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out ${
          checked ? 'translate-x-[24px]' : 'translate-x-0'
        }`}
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
  accentClass: string;
  bgGradientClass: string;
}

function NotificationCard({
  icon,
  title,
  description,
  toggleId,
  checked,
  saving,
  onToggle,
  accentClass,
  bgGradientClass,
}: NotificationCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-500 ${
      checked
        ? `border-white/10 ${bgGradientClass}`
        : 'border-white/5 bg-white/5 hover:bg-white/[0.07]'
    } backdrop-blur-xl`}>
      {/* Decorative glow */}
      {checked && (
        <div className={`absolute -right-20 -top-20 h-40 w-40 rounded-full blur-[80px] opacity-40 ${bgGradientClass}`} />
      )}

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-5 flex-1">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border transition-all duration-500 ${
            checked
              ? `border-white/20 bg-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] text-white`
              : 'border-white/5 bg-black/20 text-gray-400'
          }`}>
            {icon}
          </div>

          <div className="flex-1">
            <h3 className={`text-[17px] font-bold transition-colors ${checked ? 'text-white' : 'text-gray-200'}`}>
              {title}
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-gray-400">
              {description}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                checked
                  ? `border-white/10 bg-white/5 ${accentClass}`
                  : 'border-white/5 bg-black/20 text-gray-500'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${checked ? accentClass.replace('text-', 'bg-') + ' shadow-[0_0_8px_currentColor]' : 'bg-gray-500'}`} />
                {saving ? 'Đang lưu...' : checked ? 'Đang bật' : 'Đã tắt'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center justify-between sm:justify-center">
          <span className="sm:hidden text-sm font-semibold text-gray-300">Trạng thái</span>
          <ToggleSwitch
            id={toggleId}
            checked={checked}
            disabled={saving}
            onChange={onToggle}
            accentColorClass={checked && toggleId === 'toggle-system-notification' ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-orange-500 to-red-500'}
          />
        </div>
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
      <section className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 p-12 text-center backdrop-blur-xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-orange-500" />
        <p className="mt-4 text-[15px] font-medium text-gray-300">Đang tải cài đặt thông báo...</p>
      </section>
    );
  }

  return (
    <section className="user-soft-panel mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-[28px] font-extrabold tracking-tight text-white sm:text-3xl">
          Tùy chỉnh thông báo
        </h2>
        <p className="mt-2 text-[15px] text-gray-400">
          Kiểm soát cách bạn muốn TicketRush liên lạc với bạn. Các tùy chọn được lưu tự động.
        </p>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-200">
          <ShieldCheck className="h-5 w-5 text-red-400 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-200 animate-[fadeIn_0.3s_ease-out]">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Notification toggle cards */}
      <div className="grid gap-5">
        <NotificationCard
          icon={<Mail className="h-6 w-6" />}
          title="Thông báo qua Email"
          description="Nhận vé điện tử, hóa đơn thanh toán, lời nhắc sự kiện sắp diễn ra và các ưu đãi độc quyền từ TicketRush trực tiếp vào hòm thư của bạn."
          toggleId="toggle-email-notification"
          checked={preferences.emailNotificationEnabled}
          saving={savingEmail}
          onToggle={handleEmailToggle}
          accentClass="text-orange-400"
          bgGradientClass="bg-gradient-to-br from-orange-500/10 to-red-500/5"
        />

        <NotificationCard
          icon={<BellRing className="h-6 w-6" />}
          title="Thông báo trên Hệ thống"
          description="Cập nhật tức thời về trạng thái đơn hàng, xác nhận giữ chỗ thành công và tin tức nóng hổi ngay trên trình duyệt của bạn."
          toggleId="toggle-system-notification"
          checked={preferences.systemNotificationEnabled}
          saving={savingSystem}
          onToggle={handleSystemToggle}
          accentClass="text-indigo-400"
          bgGradientClass="bg-gradient-to-br from-indigo-500/10 to-purple-500/5"
        />
      </div>

      {/* Info card */}
      <div className="mt-8 flex gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 backdrop-blur-md">
        <Info className="h-6 w-6 shrink-0 text-blue-400" />
        <div>
          <h4 className="text-[14px] font-bold text-blue-300">Lưu ý về trải nghiệm</h4>
          <p className="mt-1.5 text-[13px] leading-relaxed text-blue-200/70">
            Chúng tôi khuyên bạn nên giữ ít nhất một kênh thông báo để không bỏ lỡ vé điện tử mã QR và các cập nhật quan trọng về sự kiện của bạn. Việc thay đổi cài đặt sẽ có hiệu lực ngay lập tức.
          </p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </section>
  );
}
