import { useMemo } from 'react';

interface AccountProfilePanelProps {
  loading: boolean;
  saving: boolean;
  error: string;
  success: string;
  username: string;
  email: string;
  profile: string;
  avatarUrl: string;
  phoneNumber: string;
  onAvatarUrlChange: (value: string) => void;
  onPhoneNumberChange: (value: string) => void;
  onProfileChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AccountProfilePanel({
  loading,
  saving,
  error,
  success,
  username,
  email,
  profile,
  avatarUrl,
  phoneNumber,
  onAvatarUrlChange,
  onPhoneNumberChange,
  onProfileChange,
  onSubmit,
}: AccountProfilePanelProps) {
  const avatarPreview = useMemo(
    () => avatarUrl.trim() || 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=120&q=80',
    [avatarUrl]
  );

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-200">
        Dang tai thong tin tai khoan...
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-1 text-2xl font-bold text-white">Tai khoan</h2>
      <p className="mb-5 text-sm text-gray-400">Cap nhat ho so, avatar va so dien thoai cua ban.</p>

      <form className="space-y-4" onSubmit={onSubmit}>
        {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        {success && <p className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}

        <div className="grid gap-4 md:grid-cols-[120px_1fr] md:items-center">
          <img src={avatarPreview} alt="Avatar" className="h-24 w-24 rounded-full object-cover ring-2 ring-orange-500/40" />
          <div>
            <label htmlFor="avatar-url" className="mb-1 block text-sm text-gray-300">
              Avatar URL
            </label>
            <input
              id="avatar-url"
              value={avatarUrl}
              onChange={e => onAvatarUrlChange(e.target.value)}
              disabled={saving}
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/60"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-gray-300">
              Ten dang nhap
            </label>
            <input
              id="username"
              value={username}
              disabled
              className="w-full rounded-xl border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-300"
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
              className="w-full rounded-xl border border-gray-800 bg-gray-800 px-3 py-2 text-sm text-gray-300"
            />
          </div>
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm text-gray-300">
            So dien thoai
          </label>
          <input
            id="phone"
            value={phoneNumber}
            onChange={e => onPhoneNumberChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/60"
            placeholder="Vi du: 0912345678"
          />
        </div>

        <div>
          <label htmlFor="profile" className="mb-1 block text-sm text-gray-300">
            Ho so
          </label>
          <textarea
            id="profile"
            rows={4}
            value={profile}
            onChange={e => onProfileChange(e.target.value)}
            disabled={saving}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/60"
            placeholder="Gioi thieu ngan ve gu am nhac cua ban"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-gradient-to-r from-red-500 to-orange-500 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
        >
          {saving ? 'Dang luu...' : 'Cap nhat tai khoan'}
        </button>
      </form>
    </section>
  );
}
