import { useState, type FormEvent } from 'react';
import {
  createAdminEvent,
  updateAdminEvent,
  uploadEventPoster,
  type AdminEvent,
  type AdminEventStatus,
  type CreateAdminEventZonePayload,
} from '../../services/eventApi';

interface AddEventFormProps {
  onCancel: () => void;
  onCreated: (event: AdminEvent) => void;
  initialEvent?: AdminEvent | null;
}

interface ZoneDraft {
  id: number;
  name: string;
  price: string;
  rowCount: number;
  seatsPerRow: number;
  colorHex: string;
}

const zonePalette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

function createZoneDraft(index: number): ZoneDraft {
  return {
    id: Date.now() + index,
    name: index === 0 ? 'VIP' : `Standard ${index}`,
    price: index === 0 ? '1500000' : '800000',
    rowCount: index === 0 ? 4 : 6,
    seatsPerRow: index === 0 ? 8 : 10,
    colorHex: zonePalette[index % zonePalette.length],
  };
}

function toDateTimeLocal(value: string | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function totalSeats(zones: ZoneDraft[]): number {
  return zones.reduce((sum, zone) => sum + zone.rowCount * zone.seatsPerRow, 0);
}

function formatCurrency(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '--';
  }

  return `${numericValue.toLocaleString('vi-VN')} VND`;
}

export default function AddEventForm({ onCancel, onCreated, initialEvent = null }: AddEventFormProps) {
  const isEditMode = initialEvent !== null;
  const [name, setName] = useState(initialEvent?.name ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [location, setLocation] = useState(initialEvent?.location ?? '');
  const [openSaleDate, setOpenSaleDate] = useState(toDateTimeLocal(initialEvent?.openSaleDate));
  const [status, setStatus] = useState<AdminEventStatus>(initialEvent?.status ?? 'UPCOMING');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [zones, setZones] = useState<ZoneDraft[]>(
    initialEvent?.zones.length
      ? initialEvent.zones.map(zone => ({
          id: zone.id,
          name: zone.name,
          price: String(zone.price),
          rowCount: zone.rowCount,
          seatsPerRow: zone.seatsPerRow,
          colorHex: zone.colorHex,
        }))
      : [createZoneDraft(0), createZoneDraft(1)],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim() || !location.trim() || !openSaleDate) {
      setError('Vui long nhap day du thong tin su kien.');
      return;
    }

    if (!posterFile && !initialEvent?.heroImageUrl) {
      setError('Vui long chon file poster su kien.');
      return;
    }

    if (zones.length === 0) {
      setError('Can cau hinh it nhat 1 khu vuc ghe.');
      return;
    }

    const normalizedZones: CreateAdminEventZonePayload[] = [];
    for (const zone of zones) {
      if (!zone.name.trim()) {
        setError('Ten khu vuc khong duoc de trong.');
        return;
      }

      const price = Number(zone.price);
      if (!Number.isFinite(price) || price <= 0) {
        setError(`Gia tien cua khu ${zone.name || 'moi'} khong hop le.`);
        return;
      }

      if (zone.rowCount < 1 || zone.rowCount > 26 || zone.seatsPerRow < 1 || zone.seatsPerRow > 100) {
        setError(`So hang/ghe cua khu ${zone.name || 'moi'} nam ngoai gioi han cho phep.`);
        return;
      }

      normalizedZones.push({
        name: zone.name.trim(),
        price,
        rowCount: zone.rowCount,
        seatsPerRow: zone.seatsPerRow,
        colorHex: zone.colorHex,
      });
    }

    try {
      setSubmitting(true);
      setError('');
      const normalizedOpenSaleDate = openSaleDate.length === 16 ? `${openSaleDate}:00` : openSaleDate;
      const posterUrl = posterFile ? await uploadEventPoster(posterFile) : initialEvent?.heroImageUrl ?? '';

      const payload = {
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        heroImageUrl: posterUrl,
        thumbnailUrl: posterUrl,
        openSaleDate: normalizedOpenSaleDate,
        status,
        zones: normalizedZones,
      };

      const savedEvent = isEditMode && initialEvent
        ? await updateAdminEvent(initialEvent.id, payload)
        : await createAdminEvent(payload);

      onCreated(savedEvent);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Khong the luu su kien');
      } else {
        setError('Khong the luu su kien');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateZone = (id: number, field: keyof ZoneDraft, value: string | number) => {
    setZones(current =>
      current.map(zone =>
        zone.id === id
          ? {
              ...zone,
              [field]: value,
            }
          : zone,
      ),
    );
  };

  const addZone = () => {
    setZones(current => [...current, createZoneDraft(current.length)]);
  };

  const removeZone = (id: number) => {
    setZones(current => current.filter(zone => zone.id !== id));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-bold text-white">{isEditMode ? 'Chinh sua su kien' : 'Them su kien moi'}</h3>

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
            Poster {isEditMode ? '(chon file moi neu muon thay)' : '(upload MinIO/local)'}
          </label>
          <input
            id="poster"
            type="file"
            accept="image/*"
            onChange={e => setPosterFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:px-3 file:py-1.5 file:text-orange-200"
            disabled={submitting}
          />
          {isEditMode && initialEvent?.thumbnailUrl && !posterFile && (
            <p className="mt-2 text-xs text-gray-500">Dang giu poster hien tai.</p>
          )}
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-white">Cau hinh so do ghe</h4>
            <p className="text-sm text-gray-400">Chia khu vuc, so hang, so ghe moi hang va gia ban cho tung loai ghe.</p>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200">
            Tong ghe: <span className="font-semibold text-white">{totalSeats(zones)}</span>
          </div>
        </div>

        <div className="space-y-4">
          {zones.map((zone, index) => (
            <div key={zone.id} className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-400">Khu vuc {index + 1}</p>
                  <p className="text-lg font-semibold text-white">{zone.name || `Khu ${index + 1}`}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeZone(zone.id)}
                  className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-300 transition hover:border-red-500/60 hover:text-red-200 disabled:opacity-50"
                  disabled={submitting || zones.length === 1}
                >
                  Xoa khu
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <label className="mb-1 block text-sm text-gray-300" htmlFor={`zone-name-${zone.id}`}>
                    Ten khu
                  </label>
                  <input
                    id={`zone-name-${zone.id}`}
                    value={zone.name}
                    onChange={e => updateZone(zone.id, 'name', e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
                    placeholder="VIP A"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300" htmlFor={`zone-price-${zone.id}`}>
                    Gia moi ghe
                  </label>
                  <input
                    id={`zone-price-${zone.id}`}
                    type="number"
                    min={1}
                    value={zone.price}
                    onChange={e => updateZone(zone.id, 'price', e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
                    placeholder="1500000"
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs text-gray-500">{formatCurrency(zone.price)}</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300" htmlFor={`zone-rows-${zone.id}`}>
                    So hang
                  </label>
                  <input
                    id={`zone-rows-${zone.id}`}
                    type="number"
                    min={1}
                    max={26}
                    value={zone.rowCount}
                    onChange={e => updateZone(zone.id, 'rowCount', Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300" htmlFor={`zone-seats-${zone.id}`}>
                    Ghe moi hang
                  </label>
                  <input
                    id={`zone-seats-${zone.id}`}
                    type="number"
                    min={1}
                    max={100}
                    value={zone.seatsPerRow}
                    onChange={e => updateZone(zone.id, 'seatsPerRow', Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-gray-300" htmlFor={`zone-color-${zone.id}`}>
                    Mau khu
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2">
                    <input
                      id={`zone-color-${zone.id}`}
                      type="color"
                      value={zone.colorHex}
                      onChange={e => updateZone(zone.id, 'colorHex', e.target.value)}
                      className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                      disabled={submitting}
                    />
                    <span className="text-sm text-gray-300">{zone.colorHex.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-200">Preview seat block</p>
                  <p className="text-xs text-gray-400">
                    {zone.rowCount * zone.seatsPerRow} ghe | {zone.rowCount} hang
                  </p>
                </div>

                <div className="space-y-2 overflow-x-auto">
                  {Array.from({ length: zone.rowCount }, (_, rowIndex) => (
                    <div key={`${zone.id}-${rowIndex}`} className="flex items-center gap-2">
                      <span className="w-5 text-xs font-semibold text-gray-500">{String.fromCharCode(65 + rowIndex)}</span>
                      <div className="flex gap-1.5">
                        {Array.from({ length: zone.seatsPerRow }, (_, seatIndex) => (
                          <span
                            key={`${zone.id}-${rowIndex}-${seatIndex}`}
                            className="h-6 w-6 rounded-md border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                            style={{ backgroundColor: zone.colorHex }}
                            title={`${zone.name} ${String.fromCharCode(65 + rowIndex)}${seatIndex + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addZone}
          className="rounded-xl border border-dashed border-orange-500/40 px-4 py-2 text-sm font-medium text-orange-200 transition hover:border-orange-400 hover:bg-orange-500/10"
          disabled={submitting}
        >
          Them khu vuc
        </button>
      </section>

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
          {submitting ? 'Dang xu ly...' : isEditMode ? 'Luu thay doi' : 'Tao su kien'}
        </button>
      </div>
    </form>
  );
}
