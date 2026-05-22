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
  gender: string;
  birthday: string;
  loginProvider?: string;
  activeHoldSecondsLeft?: number | null;
  onOpenPayments?: () => void;
  onAvatarFileChange: (file: File | null) => void;
  onEmailChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onBirthdayChange: (value: string) => void;
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
  gender,
  birthday,
  loginProvider,
  activeHoldSecondsLeft = null,
  onOpenPayments,
  onAvatarFileChange,
  onEmailChange,
  onPhoneNumberChange,
  onGenderChange,
  onBirthdayChange,
  onProfileChange,
  onSubmit,
}: AccountProfilePanelProps) {
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const isGoogleLogin = loginProvider === 'GOOGLE';
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
      <h2 className="mb-1 text-2xl font-bold gradient-text">{'T\u00e0i kho\u1ea3n'}</h2>
      <p className="mb-5 text-sm text-gray-400">{'C\u1eadp nh\u1eadt h\u1ed3 s\u01a1, avatar v\u00e0 s\u1ed1 \u0111i\u1ec7n tho\u1ea1i c\u1ee7a b\u1ea1n.'}</p>

      {activeHoldSecondsLeft != null ? (
        <div className="queue-priority-card mb-4 rounded-xl border border-yellow-500/45 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          <p className="font-semibold">{'B\u1ea1n \u0111ang c\u00f3 gi\u1eef ch\u1ed7 ch\u1edd thanh to\u00e1n.'}</p>
          <p className="mt-1">{'Th\u1eddi gian c\u00f2n l\u1ea1i:'} {Math.floor(activeHoldSecondsLeft / 60)}:{String(activeHoldSecondsLeft % 60).padStart(2, '0')}</p>
          {onOpenPayments ? (
            <button
              type="button"
              onClick={onOpenPayments}
              className="btn-primary mt-3 text-xs"
            >
              {'V\u1ec1 m\u1ee5c thanh to\u00e1n'}
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
              {'Ch\u01b0a c\u00f3 avatar'}
            </div>
          )}
          <div>
            <label htmlFor="avatar-file" className="mb-1 block text-sm text-gray-300">
              {'\u1ea2nh \u0111\u1ea1i di\u1ec7n'}
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
              {selectedAvatarFileName ? `\u0110\u00e3 ch\u1ecdn: ${selectedAvatarFileName}` : 'Ch\u1ecdn \u1ea3nh t\u1eeb m\u00e1y t\u00ednh \u0111\u1ec3 c\u1eadp nh\u1eadt avatar.'}
            </p>
            {avatarUploading && <p className="mt-1 text-xs text-purple-300">{'\u0110ang t\u1ea3i \u1ea3nh \u0111\u1ea1i di\u1ec7n...'}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="profile" className="mb-1 block text-sm text-gray-300">
            {'H\u1ecd v\u00e0 t\u00ean'}
          </label>
          <input
            id="profile"
            value={profile}
            onChange={e => onProfileChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 backdrop-blur-sm focus:border-purple-500/60"
            placeholder={'V\u00ed d\u1ee5: Nguy\u1ec5n V\u0103n A'}
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-gray-300">
            Email {isGoogleLogin && <span className="text-xs text-yellow-400">{'(\u0111\u0103ng nh\u1eadp b\u1eb1ng Google - kh\u00f4ng th\u1ec3 thay \u0111\u1ed5i)'}</span>}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            disabled={saving || isGoogleLogin}
            className={`w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-gray-500 backdrop-blur-sm ${
              isGoogleLogin
                ? 'cursor-not-allowed border-white/5 text-gray-500'
                : 'text-white focus:border-purple-500/60'
            }`}
            placeholder={isGoogleLogin ? '' : 'V\u00ed d\u1ee5: email@example.com'}
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm text-gray-300">
            {'S\u1ed1 \u0111i\u1ec7n tho\u1ea1i'}
          </label>
          <input
            id="phone"
            value={phoneNumber}
            onChange={e => onPhoneNumberChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 backdrop-blur-sm focus:border-purple-500/60"
            placeholder={'V\u00ed d\u1ee5: 0912345678'}
          />
        </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="gender" className="mb-1 block text-sm text-gray-300">
            {'Gi\u1edbi t\u00ednh'}
          </label>
          <select
            id="gender"
            value={gender}
            onChange={e => onGenderChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none backdrop-blur-sm focus:border-purple-500/60"
          >
            <option value="" className="bg-gray-900">{'Ch\u01b0a c\u1eadp nh\u1eadt'}</option>
            <option value="MALE" className="bg-gray-900">Nam</option>
            <option value="FEMALE" className="bg-gray-900">{'N\u1eef'}</option>
            <option value="OTHER" className="bg-gray-900">{'Kh\u00e1c'}</option>
          </select>
        </div>

        <div>
          <label htmlFor="birthday" className="mb-1 block text-sm text-gray-300">
            {'Ng\u00e0y sinh'}
          </label>
          <input
            id="birthday"
            type="date"
            value={birthday}
            onChange={e => onBirthdayChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none backdrop-blur-sm focus:border-purple-500/60"
          />
        </div>
      </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? '\u0110ang l\u01b0u...' : 'C\u1eadp nh\u1eadt t\u00e0i kho\u1ea3n'}
        </button>
      </form>
    </section>
  );
}
