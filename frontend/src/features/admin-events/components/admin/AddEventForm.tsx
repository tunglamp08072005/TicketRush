import { useMemo, useState, type FormEvent } from 'react';
import {
  createAdminEvent,
  updateAdminEvent,
  uploadEventLayoutMap,
  uploadEventPoster,
  type AdminEvent,
  type AdminEventCategory,
  type CreateAdminEventZonePayload,
} from '../../../events/services/eventApi';

interface AddEventFormProps {
  onCancel: () => void;
  onCreated: (event: AdminEvent) => void;
  initialEvent?: AdminEvent | null;
}

interface ZoneDraft {
  id: number;
  name: string;
  locationDescription: string;
  price: string;
  rowCount: number;
  seatsPerRow: number;
  colorHex: string;
}

type FieldErrors = Partial<Record<'name' | 'description' | 'location' | 'openSaleDate' | 'saleEndDate' | 'eventStartDate' | 'posterFile' | 'layoutMapFile' | 'category' | 'zones', string>>;
type ZoneField = 'name' | 'price' | 'rowCount' | 'seatsPerRow';
type ZoneErrors = Record<number, Partial<Record<ZoneField, string>>>;

const CATEGORY_OPTIONS: Array<{ value: AdminEventCategory; label: string }> = [
  { value: 'NHAC_SONG', label: 'Nhạc sống' },
  { value: 'SAN_KHAU', label: 'Sân khấu & Nghệ thuật' },
  { value: 'THE_THAO', label: 'Thể thao' },
  { value: 'HOI_THAO', label: 'Hội thảo & Workshop' },
  { value: 'TRAI_NGHIEM', label: 'Tham quan & Trải nghiệm' },
  { value: 'KHAC', label: 'Khác' },
];

const zonePalette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

const PROVINCE_CITY_OPTIONS = [
  'Hà Nội',
  'Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'An Giang',
  'Bà Rịa - Vũng Tàu',
  'Bắc Giang',
  'Bắc Ninh',
  'Bình Dương',
  'Đồng Nai',
  'Khánh Hòa',
  'Lâm Đồng',
  'Nghệ An',
  'Quảng Ninh',
  'Thừa Thiên Huế',
  'Thanh Hóa',
];

const DISTRICT_OPTIONS_BY_PROVINCE: Record<string, string[]> = {
  'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Thanh Xuân', 'Hoàng Mai', 'Long Biên'],
  'Hồ Chí Minh': ['Quận 1', 'Quận 3', 'Quận 7', 'Quận Bình Thạnh', 'Quận Tân Bình', 'Quận Gò Vấp', 'Quận Phú Nhuận', 'Thành phố Thủ Đức', 'Huyện Bình Chánh'],
  'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'],
  'Hải Phòng': ['Hồng Bàng', 'Lê Chân', 'Ngô Quyền', 'Hải An', 'Kiến An', 'Dương Kinh'],
  'Cần Thơ': ['Ninh Kiều', 'Bình Thủy', 'Cái Răng', 'Ô Môn', 'Thốt Nốt'],
};

const WARD_OPTIONS_BY_DISTRICT: Record<string, string[]> = {
  'Ba Đình': ['Phúc Xá', 'Trúc Bạch', 'Ngọc Hà', 'Kim Mã'],
  'Cầu Giấy': ['Dịch Vọng', 'Dịch Vọng Hậu', 'Mai Dịch', 'Nghĩa Đô', 'Quan Hoa', 'Yên Hòa'],
  'Nam Từ Liêm': ['Mễ Trì', 'Mỹ Đình 1', 'Mỹ Đình 2', 'Phú Đô', 'Trung Văn', 'Xuân Phương'],
  'Quận 1': ['Bến Nghé', 'Bến Thành', 'Đa Kao', 'Nguyễn Thái Bình'],
  'Quận 7': ['Tân Phú', 'Tân Hưng', 'Tân Quy', 'Phú Mỹ'],
  'Thành phố Thủ Đức': ['An Khánh', 'An Lợi Đông', 'Hiệp Bình Chánh', 'Linh Tây', 'Thảo Điền'],
  'Hải Châu': ['Hải Châu 1', 'Hải Châu 2', 'Phước Ninh', 'Thanh Bình'],
};

function normalizeVietnameseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function uniqueList(values: string[]): string[] {
  return Array.from(new Set(values));
}

function optionMatches(option: string, keyword: string): boolean {
  if (!keyword.trim()) {
    return true;
  }

  return normalizeVietnameseText(option).includes(normalizeVietnameseText(keyword));
}

function filterSuggestions(options: string[], keyword: string): string[] {
  return uniqueList(options.filter(option => optionMatches(option, keyword)));
}

function createZoneDraft(index: number): ZoneDraft {
  return {
    id: Date.now() + index,
    name: index === 0 ? 'VIP' : `Standard ${index}`,
    locationDescription: index === 0 ? 'Cạnh sân khấu' : '',
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

function expectedRevenue(zones: ZoneDraft[]): number {
  return zones.reduce((sum, zone) => {
    const price = Number(zone.price);
    if (!Number.isFinite(price) || price <= 0) {
      return sum;
    }
    return sum + price * zone.rowCount * zone.seatsPerRow;
  }, 0);
}

function formatCurrency(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '--';
  }

  return `${numericValue.toLocaleString('vi-VN')} VND`;
}

function parseLocationParts(rawLocation: string | undefined): {
  provinceCity: string;
  district: string;
  ward: string;
  streetAddress: string;
} {
  const value = (rawLocation || '').trim();
  if (!value) {
    return {
      provinceCity: '',
      district: '',
      ward: '',
      streetAddress: '',
    };
  }

  const parts = value.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length < 4) {
    return {
      provinceCity: '',
      district: '',
      ward: '',
      streetAddress: value,
    };
  }

  const provinceCity = parts[parts.length - 1];
  const district = parts[parts.length - 2];
  const ward = parts[parts.length - 3];
  const streetAddress = parts.slice(0, -3).join(', ');

  return {
    provinceCity,
    district,
    ward,
    streetAddress,
  };
}

export default function AddEventForm({ onCancel, onCreated, initialEvent = null }: AddEventFormProps) {
  const isEditMode = initialEvent !== null;
  const initialLocationParts = parseLocationParts(initialEvent?.location);
  const [name, setName] = useState(initialEvent?.name ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [provinceCity, setProvinceCity] = useState(initialLocationParts.provinceCity);
  const [district, setDistrict] = useState(initialLocationParts.district);
  const [ward, setWard] = useState(initialLocationParts.ward);
  const [streetAddress, setStreetAddress] = useState(initialLocationParts.streetAddress);
  const [openSaleDate, setOpenSaleDate] = useState(toDateTimeLocal(initialEvent?.openSaleDate));
  const [saleEndDate, setSaleEndDate] = useState(toDateTimeLocal(initialEvent?.saleEndDate));
  const [eventStartDate, setEventStartDate] = useState(toDateTimeLocal(initialEvent?.eventStartDate));
  const [category, setCategory] = useState<AdminEventCategory>(initialEvent?.category ?? 'KHAC');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [layoutMapFile, setLayoutMapFile] = useState<File | null>(null);
  const [zones, setZones] = useState<ZoneDraft[]>(
    initialEvent?.zones.length
      ? initialEvent.zones.map(zone => ({
          id: zone.id,
          name: zone.name,
          locationDescription: zone.locationDescription ?? '',
          price: String(zone.price),
          rowCount: zone.rowCount,
          seatsPerRow: zone.seatsPerRow,
          colorHex: zone.colorHex,
        }))
      : [createZoneDraft(0), createZoneDraft(1)],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [zoneErrors, setZoneErrors] = useState<ZoneErrors>({});

  const provinceCitySuggestions = useMemo(
    () => filterSuggestions(PROVINCE_CITY_OPTIONS, provinceCity),
    [provinceCity],
  );

  const districtBaseOptions = useMemo(() => {
    const matchedProvinces = PROVINCE_CITY_OPTIONS.filter(option => optionMatches(option, provinceCity));

    if (matchedProvinces.length === 1) {
      return DISTRICT_OPTIONS_BY_PROVINCE[matchedProvinces[0]] || [];
    }

    if (matchedProvinces.length > 1) {
      return uniqueList(matchedProvinces.flatMap(option => DISTRICT_OPTIONS_BY_PROVINCE[option] || []));
    }

    return uniqueList(Object.values(DISTRICT_OPTIONS_BY_PROVINCE).flat());
  }, [provinceCity]);

  const districtSuggestions = useMemo(
    () => filterSuggestions(districtBaseOptions, district),
    [districtBaseOptions, district],
  );

  const wardBaseOptions = useMemo(() => {
    const matchedDistricts = districtBaseOptions.filter(option => optionMatches(option, district));

    if (matchedDistricts.length === 1) {
      return WARD_OPTIONS_BY_DISTRICT[matchedDistricts[0]] || [];
    }

    if (matchedDistricts.length > 1) {
      return uniqueList(matchedDistricts.flatMap(option => WARD_OPTIONS_BY_DISTRICT[option] || []));
    }

    return uniqueList(Object.values(WARD_OPTIONS_BY_DISTRICT).flat());
  }, [districtBaseOptions, district]);

  const wardSuggestions = useMemo(
    () => filterSuggestions(wardBaseOptions, ward),
    [wardBaseOptions, ward],
  );

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 ${
      hasError ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-orange-400'
    }`;

  const setSingleField = <K extends keyof FieldErrors>(key: K, value: string) => {
    setFieldErrors(current => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
    return value;
  };

  const clearZoneError = (id: number, field: ZoneField) => {
    setZoneErrors(current => {
      const currentZone = current[id];
      if (!currentZone?.[field]) {
        return current;
      }

      const nextZone = { ...currentZone };
      delete nextZone[field];
      const next = { ...current };
      if (Object.keys(nextZone).length === 0) {
        delete next[id];
      } else {
        next[id] = nextZone;
      }
      return next;
    });
  };

  const validateForm = (): boolean => {
    const nextFieldErrors: FieldErrors = {};
    const nextZoneErrors: ZoneErrors = {};

    if (!name.trim()) {
      nextFieldErrors.name = 'Vui lòng nhập tên sự kiện.';
    }
    if (!description.trim()) {
      nextFieldErrors.description = 'Vui lòng nhập mô tả sự kiện.';
    }
    if (!provinceCity.trim()) {
      nextFieldErrors.location = 'Vui lòng chọn Tỉnh / Thành phố.';
    } else if (!district.trim()) {
      nextFieldErrors.location = 'Vui lòng nhập Quận / Huyện.';
    } else if (!ward.trim()) {
      nextFieldErrors.location = 'Vui lòng nhập Phường / Xã.';
    } else if (!streetAddress.trim()) {
      nextFieldErrors.location = 'Vui lòng nhập Số nhà, Tên đường.';
    }
    if (!openSaleDate) {
      nextFieldErrors.openSaleDate = 'Vui lòng chọn ngày mở bán.';
    }
    if (!eventStartDate) {
      nextFieldErrors.eventStartDate = 'Vui lòng chọn ngày giờ diễn ra.';
    }
    if (!saleEndDate) {
      nextFieldErrors.saleEndDate = 'Vui lòng chọn thời gian ngừng bán.';
    }
    if (!posterFile && !initialEvent?.heroImageUrl) {
      nextFieldErrors.posterFile = 'Vui lòng chọn poster sự kiện.';
    }
    if (!layoutMapFile && !initialEvent?.layoutMapUrl) {
      nextFieldErrors.layoutMapFile = 'Vui lòng chọn sơ đồ tổng thể.';
    }

    const openSaleTimestamp = Date.parse(openSaleDate);
    const saleEndTimestamp = Date.parse(saleEndDate);
    const eventStartTimestamp = Date.parse(eventStartDate);

    if (Number.isFinite(openSaleTimestamp) && Number.isFinite(saleEndTimestamp) && openSaleTimestamp > saleEndTimestamp) {
      nextFieldErrors.saleEndDate = 'Thời gian ngừng bán phải sau thời gian mở bán.';
    }

    if (Number.isFinite(saleEndTimestamp) && Number.isFinite(eventStartTimestamp) && saleEndTimestamp > eventStartTimestamp) {
      nextFieldErrors.saleEndDate = 'Thời gian ngừng bán phải trước thời gian diễn ra.';
    }

    if (!CATEGORY_OPTIONS.some(option => option.value === category)) {
      nextFieldErrors.category = 'Vui lòng chọn thể loại sự kiện.';
    }

    if (zones.length === 0) {
      nextFieldErrors.zones = 'Cần cấu hình ít nhất 1 khu vực ghế.';
    }

    zones.forEach(zone => {
      const zoneFieldErrors: Partial<Record<ZoneField, string>> = {};
      if (!zone.name.trim()) {
        zoneFieldErrors.name = 'Vui lòng nhập tên khu.';
      }

      const price = Number(zone.price);
      if (!Number.isFinite(price) || price <= 0) {
        zoneFieldErrors.price = 'Giá ghế phải lớn hơn 0.';
      }

      if (!Number.isInteger(zone.rowCount) || zone.rowCount < 1 || zone.rowCount > 26) {
        zoneFieldErrors.rowCount = 'Số hàng từ 1 đến 26.';
      }

      if (!Number.isInteger(zone.seatsPerRow) || zone.seatsPerRow < 1 || zone.seatsPerRow > 100) {
        zoneFieldErrors.seatsPerRow = 'Ghế mỗi hàng từ 1 đến 100.';
      }

      if (Object.keys(zoneFieldErrors).length > 0) {
        nextZoneErrors[zone.id] = zoneFieldErrors;
      }
    });

    setFieldErrors(nextFieldErrors);
    setZoneErrors(nextZoneErrors);

    return Object.keys(nextFieldErrors).length === 0 && Object.keys(nextZoneErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc (các trường viền đỏ).');
      return;
    }

    const normalizedZones: CreateAdminEventZonePayload[] = zones.map(zone => ({
      name: zone.name.trim(),
      price: Number(zone.price),
      rowCount: zone.rowCount,
      seatsPerRow: zone.seatsPerRow,
      colorHex: zone.colorHex,
      locationDescription: zone.locationDescription.trim() || undefined,
    }));

    try {
      setSubmitting(true);
      setError('');
      const normalizedOpenSaleDate = openSaleDate.length === 16 ? `${openSaleDate}:00` : openSaleDate;
      const normalizedSaleEndDate = saleEndDate.length === 16 ? `${saleEndDate}:00` : saleEndDate;
      const normalizedEventStartDate = eventStartDate.length === 16 ? `${eventStartDate}:00` : eventStartDate;
      const normalizedLocation = `${streetAddress.trim()}, ${ward.trim()}, ${district.trim()}, ${provinceCity.trim()}`;
      const posterUrl = posterFile ? await uploadEventPoster(posterFile) : initialEvent?.heroImageUrl ?? '';
      const layoutMapUrl = layoutMapFile ? await uploadEventLayoutMap(layoutMapFile) : initialEvent?.layoutMapUrl ?? '';

      const payload = {
        name: name.trim(),
        description: description.trim(),
        location: normalizedLocation,
        heroImageUrl: posterUrl,
        thumbnailUrl: posterUrl,
        layoutMapUrl,
        openSaleDate: normalizedOpenSaleDate,
        saleEndDate: normalizedSaleEndDate,
        eventStartDate: normalizedEventStartDate,
        category,
        zones: normalizedZones,
      };

      const savedEvent = isEditMode && initialEvent
        ? await updateAdminEvent(initialEvent.id, payload)
        : await createAdminEvent(payload);

      onCreated(savedEvent);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể lưu sự kiện');
      } else {
        setError('Không thể lưu sự kiện');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const updateZone = (id: number, field: keyof ZoneDraft, value: string | number) => {
    if (field === 'name' || field === 'price' || field === 'rowCount' || field === 'seatsPerRow') {
      clearZoneError(id, field);
    }
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
      <h3 className="text-xl font-bold text-slate-800">{isEditMode ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}</h3>
      <p className="text-xs text-slate-500">Các trường có dấu <span className="font-semibold text-red-600">*</span> là bắt buộc.</p>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div>
        <label className="mb-1 block text-sm text-slate-600" htmlFor="name">
          Tên sự kiện <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          value={name}
          onChange={e => setName(setSingleField('name', e.target.value))}
          className={inputClass(Boolean(fieldErrors.name))}
          placeholder="Ví dụ: Concert Đen Vâu 2026"
          disabled={submitting}
        />
        {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm text-slate-600" htmlFor="description">
          Mô tả <span className="text-red-600">*</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={e => setDescription(setSingleField('description', e.target.value))}
          rows={3}
          className={inputClass(Boolean(fieldErrors.description))}
          placeholder="Mô tả ngắn về sự kiện"
          disabled={submitting}
        />
        {fieldErrors.description && <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="provinceCity">
            Tỉnh / Thành phố <span className="text-red-600">*</span>
          </label>
          <input
            id="provinceCity"
            list="province-city-options"
            value={provinceCity}
            onChange={e => setProvinceCity(setSingleField('location', e.target.value))}
            className={inputClass(Boolean(fieldErrors.location))}
            placeholder="Ví dụ: Hà Nội"
            disabled={submitting}
          />
          <datalist id="province-city-options">
            {provinceCitySuggestions.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="district">
            Quận / Huyện <span className="text-red-600">*</span>
          </label>
          <input
            id="district"
            list="district-options"
            value={district}
            onChange={e => setDistrict(setSingleField('location', e.target.value))}
            className={inputClass(Boolean(fieldErrors.location))}
            placeholder="Ví dụ: Nam Từ Liêm"
            disabled={submitting}
          />
          <datalist id="district-options">
            {districtSuggestions.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="ward">
            Phường / Xã <span className="text-red-600">*</span>
          </label>
          <input
            id="ward"
            list="ward-options"
            value={ward}
            onChange={e => setWard(setSingleField('location', e.target.value))}
            className={inputClass(Boolean(fieldErrors.location))}
            placeholder="Ví dụ: Mễ Trì"
            disabled={submitting}
          />
          <datalist id="ward-options">
            {wardSuggestions.map(option => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="streetAddress">
            Số nhà, Tên đường <span className="text-red-600">*</span>
          </label>
          <input
            id="streetAddress"
            value={streetAddress}
            onChange={e => setStreetAddress(setSingleField('location', e.target.value))}
            className={inputClass(Boolean(fieldErrors.location))}
            placeholder="Ví dụ: Số 1 Đại lộ Thăng Long"
            disabled={submitting}
          />
        </div>

        {fieldErrors.location && <p className="md:col-span-2 mt-1 text-xs text-red-600">{fieldErrors.location}</p>}

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="openSaleDate">
            Ngày mở bán <span className="text-red-600">*</span>
          </label>
          <input
            id="openSaleDate"
            type="datetime-local"
            value={openSaleDate}
            onChange={e => setOpenSaleDate(setSingleField('openSaleDate', e.target.value))}
            className={inputClass(Boolean(fieldErrors.openSaleDate))}
            disabled={submitting}
          />
          {fieldErrors.openSaleDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.openSaleDate}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="eventStartDate">
            Ngày giờ diễn ra sự kiện <span className="text-red-600">*</span>
          </label>
          <input
            id="eventStartDate"
            type="datetime-local"
            value={eventStartDate}
            onChange={e => setEventStartDate(setSingleField('eventStartDate', e.target.value))}
            className={inputClass(Boolean(fieldErrors.eventStartDate))}
            disabled={submitting}
          />
          {fieldErrors.eventStartDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.eventStartDate}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="saleEndDate">
            Thời gian ngừng bán <span className="text-red-600">*</span>
          </label>
          <input
            id="saleEndDate"
            type="datetime-local"
            value={saleEndDate}
            onChange={e => setSaleEndDate(setSingleField('saleEndDate', e.target.value))}
            className={inputClass(Boolean(fieldErrors.saleEndDate))}
            disabled={submitting}
          />
          {fieldErrors.saleEndDate && <p className="mt-1 text-xs text-red-600">{fieldErrors.saleEndDate}</p>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="poster">
            Poster {isEditMode ? '(chọn file mới nếu muốn thay)' : '(upload MinIO)'} <span className="text-red-600">*</span>
          </label>
          <input
            id="poster"
            type="file"
            accept="image/*"
            onChange={e => {
              setPosterFile(e.target.files?.[0] ?? null);
              setFieldErrors(current => {
                if (!current.posterFile) {
                  return current;
                }
                const next = { ...current };
                delete next.posterFile;
                return next;
              });
            }}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-1.5 file:text-orange-700 ${fieldErrors.posterFile ? 'border-red-300' : 'border-slate-200'}`}
            disabled={submitting}
          />
          {fieldErrors.posterFile && <p className="mt-1 text-xs text-red-600">{fieldErrors.posterFile}</p>}
          {isEditMode && initialEvent?.thumbnailUrl && !posterFile && (
            <p className="mt-2 text-xs text-slate-500">Đang giữ poster hiện tại.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="layoutMap">
            Sơ đồ tổng thể (Layout Map) <span className="text-red-600">*</span>
          </label>
          <input
            id="layoutMap"
            type="file"
            accept="image/*"
            onChange={e => {
              setLayoutMapFile(e.target.files?.[0] ?? null);
              setFieldErrors(current => {
                if (!current.layoutMapFile) {
                  return current;
                }
                const next = { ...current };
                delete next.layoutMapFile;
                return next;
              });
            }}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-100 file:px-3 file:py-1.5 file:text-cyan-700 ${fieldErrors.layoutMapFile ? 'border-red-300' : 'border-slate-200'}`}
            disabled={submitting}
          />
          {fieldErrors.layoutMapFile && <p className="mt-1 text-xs text-red-600">{fieldErrors.layoutMapFile}</p>}
          {isEditMode && initialEvent?.layoutMapUrl && !layoutMapFile && (
            <p className="mt-2 text-xs text-slate-500">Đang giữ sơ đồ tổng thể hiện tại.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-600" htmlFor="eventCategory">
            Thể loại <span className="text-red-600">*</span>
          </label>
          <select
            id="eventCategory"
            value={category}
            onChange={e => setCategory(setSingleField('category', e.target.value) as AdminEventCategory)}
            className={inputClass(Boolean(fieldErrors.category))}
            disabled={submitting}
          >
            {CATEGORY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {fieldErrors.category && <p className="mt-1 text-xs text-red-600">{fieldErrors.category}</p>}
        </div>

      </div>

      <section className={`space-y-4 rounded-2xl border bg-white p-4 shadow-sm ${fieldErrors.zones ? 'border-red-300' : 'border-slate-200'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-800">Cấu hình sơ đồ ghế</h4>
            <p className="text-sm text-slate-500">Chia khu vực, số hàng, số ghế mỗi hàng và giá bán cho từng loại ghế.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Tổng ghế: <span className="font-semibold text-slate-900">{totalSeats(zones)}</span>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Doanh thu dự kiến: <span className="font-semibold">{expectedRevenue(zones).toLocaleString('vi-VN')} VND</span>
          </div>
        </div>
        {fieldErrors.zones && <p className="text-sm text-red-600">{fieldErrors.zones}</p>}

        <div className="space-y-4">
          {zones.map((zone, index) => (
            <div key={zone.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Khu vực {index + 1}</p>
                  <p className="text-lg font-semibold text-slate-800">{zone.name || `Khu ${index + 1}`}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeZone(zone.id)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                  disabled={submitting || zones.length === 1}
                >
                  Xóa khu
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div>
                  <label className="mb-1 block text-sm text-slate-600" htmlFor={`zone-name-${zone.id}`}>
                    Tên khu <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={`zone-name-${zone.id}`}
                    value={zone.name}
                    onChange={e => updateZone(zone.id, 'name', e.target.value)}
                    className={inputClass(Boolean(zoneErrors[zone.id]?.name))}
                    placeholder="VIP A"
                    disabled={submitting}
                  />
                  {zoneErrors[zone.id]?.name && <p className="mt-1 text-xs text-red-600">{zoneErrors[zone.id]?.name}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-600" htmlFor={`zone-location-${zone.id}`}>
                    Mô tả vị trí
                  </label>
                  <input
                    id={`zone-location-${zone.id}`}
                    value={zone.locationDescription}
                    onChange={e => updateZone(zone.id, 'locationDescription', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-orange-400"
                    placeholder="Cạnh sân khấu"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-600" htmlFor={`zone-price-${zone.id}`}>
                    Giá mỗi ghế <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={`zone-price-${zone.id}`}
                    type="number"
                    min={1}
                    value={zone.price}
                    onChange={e => updateZone(zone.id, 'price', e.target.value)}
                    className={inputClass(Boolean(zoneErrors[zone.id]?.price))}
                    placeholder="1500000"
                    disabled={submitting}
                  />
                  {zoneErrors[zone.id]?.price && <p className="mt-1 text-xs text-red-600">{zoneErrors[zone.id]?.price}</p>}
                  <p className="mt-1 text-xs text-slate-500">{formatCurrency(zone.price)}</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-600" htmlFor={`zone-rows-${zone.id}`}>
                    Số hàng <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={`zone-rows-${zone.id}`}
                    type="number"
                    min={1}
                    max={26}
                    value={zone.rowCount}
                    onChange={e => updateZone(zone.id, 'rowCount', Number(e.target.value))}
                    className={inputClass(Boolean(zoneErrors[zone.id]?.rowCount))}
                    disabled={submitting}
                  />
                  {zoneErrors[zone.id]?.rowCount && <p className="mt-1 text-xs text-red-600">{zoneErrors[zone.id]?.rowCount}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-600" htmlFor={`zone-seats-${zone.id}`}>
                    Ghế mỗi hàng <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={`zone-seats-${zone.id}`}
                    type="number"
                    min={1}
                    max={100}
                    value={zone.seatsPerRow}
                    onChange={e => updateZone(zone.id, 'seatsPerRow', Number(e.target.value))}
                    className={inputClass(Boolean(zoneErrors[zone.id]?.seatsPerRow))}
                    disabled={submitting}
                  />
                  {zoneErrors[zone.id]?.seatsPerRow && <p className="mt-1 text-xs text-red-600">{zoneErrors[zone.id]?.seatsPerRow}</p>}
                </div>

                <div>
                  <label className="mb-1 block text-sm text-slate-600" htmlFor={`zone-color-${zone.id}`}>
                    Màu khu
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <input
                      id={`zone-color-${zone.id}`}
                      type="color"
                      value={zone.colorHex}
                      onChange={e => updateZone(zone.id, 'colorHex', e.target.value)}
                      className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                      disabled={submitting}
                    />
                    <span className="text-sm text-slate-600">{zone.colorHex.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">Xem trước ma trận ghế</p>
                  <p className="text-xs text-slate-500">
                    {zone.rowCount * zone.seatsPerRow} ghế | {zone.rowCount} hàng
                  </p>
                </div>

                <div className="space-y-2 overflow-x-auto">
                  {Array.from({ length: zone.rowCount }, (_, rowIndex) => (
                    <div key={`${zone.id}-${rowIndex}`} className="flex items-center gap-2">
                      <span className="w-5 text-xs font-semibold text-slate-500">{String.fromCharCode(65 + rowIndex)}</span>
                      <div className="flex gap-1.5">
                        {Array.from({ length: zone.seatsPerRow }, (_, seatIndex) => (
                          <span
                            key={`${zone.id}-${rowIndex}-${seatIndex}`}
                            className="h-6 w-6 rounded-md border border-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
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
          className="rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 transition hover:border-orange-400 hover:bg-orange-100"
          disabled={submitting}
        >
          Thêm khu vực
        </button>
      </section>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-400"
          disabled={submitting}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
          disabled={submitting}
        >
          {submitting ? 'Đang xử lý...' : isEditMode ? 'Lưu thay đổi' : 'Tạo sự kiện'}
        </button>
      </div>
    </form>
  );
}
