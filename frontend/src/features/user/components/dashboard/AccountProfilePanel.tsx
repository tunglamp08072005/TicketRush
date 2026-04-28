import { useEffect, useMemo, useState } from 'react';

interface AccountProfilePanelProps {
  loading: boolean;
  saving: boolean;
  avatarUploading: boolean;
  error: string;
  success: string;
  email: string;
  profile: string;
  avatarUrl: string;
  selectedAvatarFileName: string;
  phoneNumber: string;
  queueSlotSecondsLeft?: number | null;
  onReturnToBooking?: () => void;
  onAvatarFileChange: (file: File | null) => void;
  onPhoneNumberChange: (value: string) => void;
  onProfileChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AccountProfilePanel({
  loading,
  saving,
  avatarUploading,
  error,
  success,
  email,
  profile,
  avatarUrl,
  selectedAvatarFileName,
  phoneNumber,
  queueSlotSecondsLeft = null,
  onReturnToBooking,
  onAvatarFileChange,
  onPhoneNumberChange,
  onProfileChange,
  onSubmit,
}: AccountProfilePanelProps) {
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const avatarPreview = useMemo(() => avatarUrl.trim(), [avatarUrl]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarPreview]);

  if (loading) {
    return (
      <section className="card-3d rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div className="flex animate-pulse flex-col items-center gap-4">
          <div className="h-24 w-24 rounded-full bg-white/10" />
          <div className="h-4 w-32 rounded bg-white/10" />
        </div>
      </section>
    );
  }

  return (
    <section className="card-3d rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <h2 className="mb-1 text-2xl font-bold gradient-text">Tài khoản</h2>
      <p className="mb-5 text-sm text-gray-400">Cập nhật hồ sơ, avatar và số điện thoại của bạn.</p>

      {queueSlotSecondsLeft != null ? (
        <div className="mb-4 rounded-xl border border-yellow-500/45 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          <p className="font-semibold">Bạn đang giữ quyền ưu tiên đặt vé.</p>
          <p className="mt-1">Thời gian còn lại: {Math.floor(queueSlotSecondsLeft / 60)}:{String(queueSlotSecondsLeft % 60).padStart(2, '0')}</p>
          {onReturnToBooking ? (
            <button
              type="button"
              onClick={onReturnToBooking}
              className="btn-primary mt-3 text-xs"
            >
              Quay lại chọn ghế
            </button>
          ) : null}
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit}>
        {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        {success && <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}

        <div className="grid gap-4 md:grid-cols-[120px_1fr] md:items-center">
          {avatarPreview && !avatarLoadFailed ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-purple-500/50 glow-pulse"
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-purple-500/30 bg-white/5 text-center text-[11px] text-gray-400">
              Chưa có avatar
            </div>
          )}
          <div>
            <label htmlFor="avatar-file" className="mb-1 block text-sm text-gray-300">
              Ảnh đại diện
            </label>
            <input
              id="avatar-file"
              type="file"
              accept="image/*"
              onChange={e => onAvatarFileChange(e.target.files?.[0] ?? null)}
              disabled={saving || avatarUploading}
              className="block w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 backdrop-blur-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-purple-500 file:to-pink-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
            />
            <p className="mt-2 text-xs text-gray-400">
              {selectedAvatarFileName ? `Đã chọn: ${selectedAvatarFileName}` : 'Chọn ảnh từ máy tính để cập nhật avatar.'}
            </p>
            {avatarUploading && <p className="mt-1 text-xs text-purple-300">Đang tải ảnh đại diện...</p>}
          </div>
        </div>

        <div>
          <label htmlFor="profile" className="mb-1 block text-sm text-gray-300">
            Họ và tên
          </label>
          <input
            id="profile"
            value={profile}
            onChange={e => onProfileChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 backdrop-blur-sm focus:border-purple-500/60"
            placeholder="Ví dụ: Nguyễn Văn A"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-gray-300">
            Email
          </label>
          <input
            id="email"
            value={email}
            disabled
            className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-gray-300 backdrop-blur-sm"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm text-gray-300">
            Số điện thoại
          </label>
          <input
            id="phone"
            value={phoneNumber}
            onChange={e => onPhoneNumberChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 backdrop-blur-sm focus:border-purple-500/60"
            placeholder="Ví dụ: 0912345678"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? 'Đang lưu...' : 'Cập nhật tài khoản'}
        </button>
      </form>
    </section>
  );
}