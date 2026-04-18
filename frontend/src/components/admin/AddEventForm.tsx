import { useState } from 'react';
import { createAdminEvent, uploadEventPoster, type AdminEvent, type AdminEventStatus } from '../../services/eventApi';

interface AddEventFormProps {
  onCancel: () => void;
  onCreated: (event: AdminEvent) => void;
}

export default function AddEventForm({ onCancel, onCreated }: AddEventFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [openSaleDate, setOpenSaleDate] = useState('');
  const [status, setStatus] = useState<AdminEventStatus>('UPCOMING');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim() || !location.trim() || !openSaleDate) {
      setError('Vui long nhap day du thong tin su kien.');
      return;
    }

    if (!posterFile) {
      setError('Vui long chon file poster su kien.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const normalizedOpenSaleDate = openSaleDate.length === 16 ? `${openSaleDate}:00` : openSaleDate;

      const posterUrl = await uploadEventPoster(posterFile);

      const created = await createAdminEvent({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        heroImageUrl: posterUrl,
        thumbnailUrl: posterUrl,
        openSaleDate: normalizedOpenSaleDate,
        status,
      });

      onCreated(created);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Khong the tao su kien');
      } else {
        setError('Khong the tao su kien');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-bold text-white">Them su kien moi</h3>

      {error && <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div>
        <label className="mb-1 block text-sm text-gray-300" htmlFor="name">
          Ten su kien
        </label>
        <input
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/60"
          placeholder="Vi du: Concert Den Vau 2026"
          disabled={submitting}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-gray-300" htmlFor="description">
          Mo ta
        </label>
        <textarea
          id="description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/60"
          placeholder="Mo ta ngan ve su kien"
          disabled={submitting}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-300" htmlFor="location">
            Dia diem
          </label>
          <input
            id="location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-orange-500/60"
            placeholder="Nha thi dau Phu Tho"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300" htmlFor="openSaleDate">
            Ngay mo ban
          </label>
          <input
            id="openSaleDate"
            type="datetime-local"
            value={openSaleDate}
            onChange={e => setOpenSaleDate(e.target.value)}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-300" htmlFor="status">
            Trang thai
          </label>
          <select
            id="status"
            value={status}
            onChange={e => setStatus(e.target.value as AdminEventStatus)}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
            disabled={submitting}
          >
            <option value="UPCOMING">UPCOMING</option>
            <option value="ON_SALE">ON_SALE</option>
            <option value="ENDED">ENDED</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-gray-300" htmlFor="poster">
            Poster (upload MinIO)
          </label>
          <input
            id="poster"
            type="file"
            accept="image/*"
            onChange={e => setPosterFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:px-3 file:py-1.5 file:text-orange-200"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-700 px-4 py-2 text-sm text-gray-200 transition hover:border-gray-600"
          disabled={submitting}
        >
          Huy
        </button>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? 'Dang xu ly...' : 'Tao su kien'}
        </button>
      </div>
    </form>
  );
}
