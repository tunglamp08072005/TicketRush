export type DashboardMenuKey = 'home' | 'events' | 'tickets' | 'payments' | 'account' | 'support';

export interface SidebarMenuItem {
  key: DashboardMenuKey;
  label: string;
}

export interface TicketItem {
  id: string;
  eventName: string;
  eventDate: string;
  venue: string;
  seat: string;
  progress: number;
  visualType: 'barcode' | 'thumbnail';
  imageUrl?: string;
}

export interface HeroCountdown {
  hours: string;
  minutes: string;
  seconds: string;
}

export const sidebarMenuItems: SidebarMenuItem[] = [
  { key: 'home', label: 'Trang chủ' },
  { key: 'events', label: 'Sự kiện' },
  { key: 'tickets', label: 'Vé của tôi' },
  { key: 'payments', label: 'Thanh toán' },
  { key: 'account', label: 'Tài khoản' },
  { key: 'support', label: 'Hỗ trợ' },
];

export const heroData = {
  title: 'CONCERT DEN VAU - CHUNG TA SE TRO THANH AI',
  subtitle: '15.05.2026 | Nhà thi đấu Phú Thọ',
  countdownLabel: 'Mở bán sau:',
  countdown: {
    hours: '01',
    minutes: '15',
    seconds: '30',
  } satisfies HeroCountdown,
  backgroundImage:
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1600&q=80',
};

export const myTicketsMock: TicketItem[] = [
  {
    id: 'TR-2026-001',
    eventName: 'Rap Viet Live Concert 2026',
    eventDate: '18.05.2026 - 19:30',
    venue: 'Nhà thi đấu Phú Thọ',
    seat: 'Khu A - Hàng 3 - Ghế 12',
    progress: 72,
    visualType: 'barcode',
  },
  {
    id: 'TR-2026-002',
    eventName: 'SpaceSpeakers Galaxy Night',
    eventDate: '01.06.2026 - 20:00',
    venue: 'Quan 7 Exhibition Center',
    seat: 'VIP Lounge - Ban 05',
    progress: 46,
    visualType: 'thumbnail',
    imageUrl:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800&q=80',
  },
];

export const userMock = {
  displayName: 'Nguyễn Văn A',
  memberTier: 'Fan Cứng - Cấp 3',
};

interface ApiEvent {
  id: number;
  name: string;
  description: string;
  location: string;
  openSaleDate: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  status: 'UPCOMING' | 'ON_SALE' | 'ENDED';
}

function formatDateTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} - ${hour}:${minute}`;
}

export function mapApiEventsToHeroData(events: ApiEvent[]) {
  const first = events[0];
  if (!first) {
    return heroData;
  }

  return {
    title: first.name,
    subtitle: `${formatDateTimeLabel(first.openSaleDate)} | ${first.location}`,
    countdownLabel: 'Mở bán sau:',
    countdown: {
      hours: '01',
      minutes: '15',
      seconds: '30',
    } as HeroCountdown,
    backgroundImage: first.heroImageUrl,
  };
}

export function mapApiEventsToTicketCards(events: ApiEvent[]): TicketItem[] {
  if (events.length === 0) {
    return myTicketsMock;
  }

  return events.slice(0, 2).map((event, index) => ({
    id: `EV-${event.id}`,
    eventName: event.name,
    eventDate: formatDateTimeLabel(event.openSaleDate),
    venue: event.location,
    seat: index === 0 ? 'Khu A - Hang 3 - Ghe 12' : 'VIP Lounge - Ban 05',
    progress: event.status === 'ENDED' ? 100 : event.status === 'ON_SALE' ? 68 : 35,
    visualType: 'thumbnail' as const,
    imageUrl: event.thumbnailUrl || event.heroImageUrl,
  }));
}
