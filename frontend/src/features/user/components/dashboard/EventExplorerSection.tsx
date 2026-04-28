import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Filter, Frown } from 'lucide-react';
import { searchPublicEvents, type UserEventDetail } from '../../../events/services/eventService';
import '../../../events/pages/EventsPage.css';

interface EventExplorerSectionProps {
  searchKeyword?: string;
  searchSubmitToken?: number;
}

type DateFilterOption = 'ALL_DAYS' | 'TODAY' | 'TOMORROW' | 'THIS_WEEKEND' | 'THIS_MONTH' | 'CUSTOM_DATE';
type LocationFilterOption = 'ALL' | 'HCM' | 'HN' | 'DA_LAT' | 'OTHER';
type CategoryOption = 'NHAC_SONG' | 'SAN_KHAU' | 'THE_THAO' | 'HOI_THAO' | 'TRAI_NGHIEM' | 'KHAC';

type EventViewModel = {
  event: UserEventDetail;
  category: CategoryOption;
  minPrice: number;
  locationCode: LocationFilterOption;
  eventDate: Date | null;
};

const CATEGORY_LABELS: Record<CategoryOption, string> = {
  NHAC_SONG: 'Nhạc sống',
  SAN_KHAU: 'Sân khấu & Nghệ thuật',
  THE_THAO: 'Thể thao',
  HOI_THAO: 'Hội thảo & Workshop',
  TRAI_NGHIEM: 'Tham quan & Trải nghiệm',
  KHAC: 'Khác',
};

const DATE_LABELS: Record<DateFilterOption, string> = {
  ALL_DAYS: 'Tất cả các ngày',
  TODAY: 'Hôm nay',
  TOMORROW: 'Ngày mai',
  THIS_WEEKEND: 'Cuối tuần này',
  THIS_MONTH: 'Trong tháng này',
  CUSTOM_DATE: 'Chọn ngày',
};

const WEEKDAY_SHORT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const LOCATION_LABELS: Record<LocationFilterOption, string> = {
  ALL: 'Toàn quốc',
  HCM: 'Hồ Chí Minh',
  HN: 'Hà Nội',
  DA_LAT: 'Đà Lạt',
  OTHER: 'Vị trí khác',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function classifyCategory(event: UserEventDetail): CategoryOption {
  if (event.category && event.category in CATEGORY_LABELS) {
    return event.category;
  }

  const joined = `${event.name} ${event.description}`.toLowerCase();

  if (joined.includes('concert') || joined.includes('live') || joined.includes('show') || joined.includes('music') || joined.includes('nhac') || joined.includes('nhạc')) {
    return 'NHAC_SONG';
  }
  if (joined.includes('kich') || joined.includes('kịch') || joined.includes('san khau') || joined.includes('sân khấu') || joined.includes('nghe thuat') || joined.includes('nghệ thuật')) {
    return 'SAN_KHAU';
  }
  if (joined.includes('sport') || joined.includes('the thao') || joined.includes('thể thao') || joined.includes('marathon')) {
    return 'THE_THAO';
  }
  if (joined.includes('workshop') || joined.includes('hoi thao') || joined.includes('hội thảo') || joined.includes('seminar')) {
    return 'HOI_THAO';
  }
  if (joined.includes('tour') || joined.includes('trai nghiem') || joined.includes('trải nghiệm') || joined.includes('tham quan')) {
    return 'TRAI_NGHIEM';
  }

  return 'KHAC';
}

function mapLocationCode(location: string): LocationFilterOption {
  const normalized = location.toLowerCase();

  if (normalized.includes('hồ chí minh') || normalized.includes('ho chi minh') || normalized.includes('tp hcm')) {
    return 'HCM';
  }
  if (normalized.includes('hà nội') || normalized.includes('ha noi')) {
    return 'HN';
  }
  if (normalized.includes('đà lạt') || normalized.includes('da lat')) {
    return 'DA_LAT';
  }

  return 'OTHER';
}

function toEventViewModel(event: UserEventDetail): EventViewModel {
  const minPrice = event.zones.length > 0 ? Math.min(...event.zones.map(zone => zone.price)) : 0;
  const eventDate = new Date(event.eventStartDate);

  return {
    event,
    category: classifyCategory(event),
    minPrice,
    locationCode: mapLocationCode(event.location),
    eventDate: Number.isNaN(eventDate.getTime()) ? null : eventDate,
  };
}

function isDateMatched(option: DateFilterOption, eventDate: Date | null): boolean {
  if (!eventDate || option === 'ALL_DAYS') {
    return true;
  }

  const now = new Date();

  if (option === 'TODAY') {
    return eventDate.toDateString() === now.toDateString();
  }

  if (option === 'TOMORROW') {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return eventDate.toDateString() === tomorrow.toDateString();
  }

  if (option === 'THIS_WEEKEND') {
    const day = now.getDay();
    const saturdayOffset = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
    const sundayOffset = day === 0 ? 0 : 7 - day;

    const saturday = new Date(now);
    saturday.setHours(0, 0, 0, 0);
    saturday.setDate(now.getDate() + saturdayOffset);

    const sunday = new Date(now);
    sunday.setHours(23, 59, 59, 999);
    sunday.setDate(now.getDate() + sundayOffset);

    return eventDate >= saturday && eventDate <= sunday;
  }

  return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
}

function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatIsoDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseIsoDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildCalendarDays(monthCursor: Date): Date[] {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    day.setHours(0, 0, 0, 0);
    return day;
  });
}

export default function EventExplorerSection({
  searchKeyword = '',
  searchSubmitToken = 0,
}: EventExplorerSectionProps) {
  const [events, setEvents] = useState<UserEventDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDateOption, setSelectedDateOption] = useState<DateFilterOption>('ALL_DAYS');
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftDateOption, setDraftDateOption] = useState<DateFilterOption>('ALL_DAYS');
  const [selectedCustomDate, setSelectedCustomDate] = useState<string | null>(null);
  const [draftCustomDate, setDraftCustomDate] = useState<string | null>(null);
  const [calendarMonthCursor, setCalendarMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedLocation, setSelectedLocation] = useState<LocationFilterOption>('ALL');
  const [isFreeOnly, setIsFreeOnly] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategoryOption[]>([]);

  const [draftLocation, setDraftLocation] = useState<LocationFilterOption>('ALL');
  const [draftFreeOnly, setDraftFreeOnly] = useState(false);
  const [draftCategories, setDraftCategories] = useState<CategoryOption[]>([]);

  const loadEvents = async (search?: string) => {
    try {
      setLoading(true);
      const searchTerm = search?.trim();
      const data = await searchPublicEvents(searchTerm ? searchTerm : undefined);
      setEvents(data);
      setError('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Không thể tải danh sách sự kiện');
      } else {
        setError('Không thể tải danh sách sự kiện');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (searchSubmitToken > 0) {
      void loadEvents(searchKeyword);
    }
  }, [searchKeyword, searchSubmitToken]);

  const eventCards = useMemo(() => events.map(toEventViewModel), [events]);

  const filteredEvents = useMemo(
    () => eventCards.filter(item => {
      const customDate = parseIsoDate(selectedCustomDate);
      const matchesDate = selectedDateOption === 'CUSTOM_DATE'
        ? (!!item.eventDate && !!customDate && isSameDay(item.eventDate, customDate))
        : isDateMatched(selectedDateOption, item.eventDate);
      const matchesLocation = selectedLocation === 'ALL' || item.locationCode === selectedLocation;
      const matchesFreeOnly = !isFreeOnly || item.minPrice === 0;
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(item.category);

      return matchesDate && matchesLocation && matchesFreeOnly && matchesCategory;
    }),
    [eventCards, isFreeOnly, selectedCategories, selectedCustomDate, selectedDateOption, selectedLocation],
  );

  const activeCategoryTag = selectedCategories.length === 1
    ? CATEGORY_LABELS[selectedCategories[0]]
    : 'Tất cả';

  const handleOpenFilter = () => {
    setDraftLocation(selectedLocation);
    setDraftFreeOnly(isFreeOnly);
    setDraftCategories([...selectedCategories]);
    setIsFilterOpen(true);
  };

  const handleOpenDateFilter = () => {
    setDraftDateOption(selectedDateOption);
    setDraftCustomDate(selectedCustomDate);
    const baseDate = parseIsoDate(selectedCustomDate) || new Date();
    setCalendarMonthCursor(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setIsDateMenuOpen(true);
  };

  const handleApplyDateFilter = () => {
    setSelectedDateOption(draftDateOption);
    setSelectedCustomDate(draftDateOption === 'CUSTOM_DATE' ? draftCustomDate : null);
    setIsDateMenuOpen(false);
  };

  const handleResetDateFilter = () => {
    setDraftDateOption('ALL_DAYS');
    setDraftCustomDate(null);
  };

  const handleApplyFilter = () => {
    setSelectedLocation(draftLocation);
    setIsFreeOnly(draftFreeOnly);
    setSelectedCategories(draftCategories);
    setIsFilterOpen(false);
  };

  const handleResetFilter = () => {
    setDraftLocation('ALL');
    setDraftFreeOnly(false);
    setDraftCategories([]);
  };

  const handleResetAll = async () => {
    setSelectedDateOption('ALL_DAYS');
    setDraftDateOption('ALL_DAYS');
    setSelectedCustomDate(null);
    setDraftCustomDate(null);
    setSelectedLocation('ALL');
    setIsFreeOnly(false);
    setSelectedCategories([]);
    setDraftLocation('ALL');
    setDraftFreeOnly(false);
    setDraftCategories([]);
    setIsDateMenuOpen(false);
    setIsFilterOpen(false);

    await loadEvents();
  };

  const toggleDraftCategory = (category: CategoryOption) => {
    setDraftCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(item => item !== category);
      }
      return [...prev, category];
    });
  };

  const handleSelectCalendarDate = (date: Date) => {
    setDraftDateOption('CUSTOM_DATE');
    setDraftCustomDate(formatIsoDate(date));
  };

  const calendarDays = useMemo(() => buildCalendarDays(calendarMonthCursor), [calendarMonthCursor]);

  const selectedDraftDate = parseIsoDate(draftCustomDate);
  const selectedDateLabel = selectedDateOption === 'CUSTOM_DATE' && selectedCustomDate
    ? (parseIsoDate(selectedCustomDate)?.toLocaleDateString('vi-VN') || DATE_LABELS.ALL_DAYS)
    : DATE_LABELS[selectedDateOption];

  return (
    <section className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h2 className="text-[28px] font-extrabold tracking-tight text-white sm:text-3xl">Danh sách sự kiện</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-2.5 text-[14px] font-semibold text-gray-300 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/10 hover:text-white"
              onClick={handleOpenDateFilter}
            >
              <Calendar className="h-[18px] w-[18px]" />
              {selectedDateLabel}
            </button>
          </div>

          <button type="button" className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500/20 to-red-500/10 border border-orange-500/30 px-4 py-2.5 text-[14px] font-semibold text-orange-400 transition-all hover:border-orange-500/50 hover:bg-orange-500/20" onClick={handleOpenFilter}>
            <Filter className="h-[18px] w-[18px]" />
            Bộ lọc
          </button>

          <button type="button" className="rounded-2xl border border-transparent px-4 py-2.5 text-[14px] font-semibold text-gray-400 transition-all hover:text-white" onClick={() => void handleResetAll()}>
            Tất cả
          </button>

          {activeCategoryTag !== 'Tất cả' ? (
            <span className="rounded-2xl bg-orange-500/20 border border-orange-500/30 px-4 py-2.5 text-[14px] font-semibold text-orange-300">{activeCategoryTag}</span>
          ) : null}
        </div>
      </div>

      {isFilterOpen ? (
        <div className="events-filter-overlay" role="presentation" onClick={() => setIsFilterOpen(false)}>
          <section className="events-filter-panel" onClick={event => event.stopPropagation()}>
            <h3>Vị trí</h3>
            <div className="events-location-options">
              {(Object.keys(LOCATION_LABELS) as LocationFilterOption[]).map(locationCode => (
                <label key={locationCode} className="events-radio-line">
                  <input
                    type="radio"
                    name="location-filter"
                    checked={draftLocation === locationCode}
                    onChange={() => setDraftLocation(locationCode)}
                  />
                  {LOCATION_LABELS[locationCode]}
                </label>
              ))}
            </div>

            <div className="events-filter-divider" />

            <div className="events-filter-row">
              <div>
                <h3>Giá tiền</h3>
                <p>Miễn phí</p>
              </div>
              <label className="events-switch" aria-label="Lọc sự kiện miễn phí">
                <input
                  type="checkbox"
                  checked={draftFreeOnly}
                  onChange={event => setDraftFreeOnly(event.target.checked)}
                />
                <span />
              </label>
            </div>

            <div className="events-filter-divider" />

            <h3>Thể loại</h3>
            <div className="events-category-chips">
              {(Object.keys(CATEGORY_LABELS) as CategoryOption[]).map(category => (
                <button
                  key={category}
                  type="button"
                  className={`events-category-chip ${draftCategories.includes(category) ? 'active' : ''}`}
                  onClick={() => toggleDraftCategory(category)}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>

            <div className="events-filter-actions">
              <button type="button" className="events-filter-reset" onClick={handleResetFilter}>Thiết lập lại</button>
              <button type="button" className="events-filter-apply" onClick={handleApplyFilter}>Áp dụng</button>
            </div>
          </section>
        </div>
      ) : null}

      {isDateMenuOpen ? (
        <div className="events-filter-overlay" role="presentation" onClick={() => setIsDateMenuOpen(false)}>
          <section className="events-filter-panel events-date-panel" onClick={event => event.stopPropagation()}>
            <h3>Tất cả các ngày</h3>
            <div className="events-date-quick-options">
              {(['ALL_DAYS', 'TODAY', 'TOMORROW', 'THIS_WEEKEND', 'THIS_MONTH'] as DateFilterOption[]).map(option => (
                <button
                  key={option}
                  type="button"
                  className={`events-date-quick-chip ${draftDateOption === option ? 'active' : ''}`}
                  onClick={() => setDraftDateOption(option)}
                >
                  {DATE_LABELS[option]}
                </button>
              ))}
            </div>

            <div className="events-calendar-head">
              <button
                type="button"
                className="events-calendar-nav"
                aria-label="Tháng trước"
                onClick={() => setCalendarMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                &lt;
              </button>
              <h4>
                {calendarMonthCursor.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </h4>
              <button
                type="button"
                className="events-calendar-nav"
                aria-label="Tháng sau"
                onClick={() => setCalendarMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                &gt;
              </button>
            </div>

            <div className="events-calendar-weekdays">
              {WEEKDAY_SHORT_LABELS.map(label => (
                <span key={label}>{label}</span>
              ))}
            </div>

            <div className="events-calendar-grid">
              {calendarDays.map(day => {
                const isCurrentMonth = day.getMonth() === calendarMonthCursor.getMonth();
                const isSelected = !!selectedDraftDate && isSameDay(day, selectedDraftDate);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`events-calendar-day ${isCurrentMonth ? '' : 'outside'} ${isSelected ? 'selected' : ''}`.trim()}
                    onClick={() => handleSelectCalendarDate(day)}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="events-filter-actions">
              <button type="button" className="events-filter-reset" onClick={handleResetDateFilter}>Thiết lập lại</button>
              <button type="button" className="events-filter-apply" onClick={handleApplyDateFilter}>Áp dụng</button>
            </div>
          </section>
        </div>
      ) : null}

      {error && <p className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-200">{error}</p>}
      {loading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 p-12 text-center backdrop-blur-xl">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-orange-500" />
          <p className="mt-4 text-[15px] font-medium text-gray-300">Đang tải danh sách sự kiện...</p>
        </div>
      )}

      {!loading && filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-16 text-center backdrop-blur-xl">
          <Frown className="h-16 w-16 text-gray-500 mb-4 opacity-50" />
          <p className="text-[15px] font-medium text-gray-300">Không tìm thấy sự kiện phù hợp, hãy thử chọn ngày hoặc bộ lọc khác.</p>
          <button type="button" className="mt-6 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-[14px] font-semibold text-gray-300 transition-all hover:bg-white/10 hover:text-white" onClick={handleResetAll}>Xóa bộ lọc</button>
        </div>
      ) : null}

      {!loading && filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEvents.map(item => (
            <article key={item.event.id} className="card-3d group relative flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0c]/80 backdrop-blur-xl transition-all duration-500 hover:-translate-y-2 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              {/* Gradient accent on hover */}
              <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-purple-500 via-pink-500 to-orange-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative h-52 w-full overflow-hidden">
                <img src={item.event.thumbnailUrl || item.event.heroImageUrl} alt={item.event.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-90" />
              </div>
              <div className="relative flex flex-1 flex-col px-5 pb-5 pt-2">
                <h3 className="text-[17px] font-bold text-white leading-tight transition-colors group-hover:text-orange-400 line-clamp-2">{item.event.name}</h3>
                <p className="mt-2 text-[13px] font-medium text-gray-400">{formatDate(item.event.eventStartDate || item.event.openSaleDate)}</p>
                <div className="mt-6 pt-1">
                  <Link to={`/user/events/${item.event.id}`} className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 text-[14px] font-bold text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(249,115,22,0.6)]">
                    Xem thông tin
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
