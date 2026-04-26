export type EventStatus = 'UPCOMING' | 'ON_SALE' | 'ENDED';
export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'SOLD';
export type EventCategory = 'NHAC_SONG' | 'SAN_KHAU' | 'THE_THAO' | 'HOI_THAO' | 'TRAI_NGHIEM' | 'KHAC';

export interface EventZone {
  id: number;
  name: string;
  code: string;
  colorHex: string;
  locationDescription?: string | null;
  price: number;
  rowCount: number;
  seatsPerRow: number;
  seatCount: number;
}

export interface FeaturedEvent {
  id: number;
  name: string;
  description: string;
  location: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  openSaleDate: string;
  saleEndDate: string;
  status: EventStatus;
  category?: EventCategory;
}

export interface UserEventDetail extends FeaturedEvent {
  layoutMapUrl: string;
  eventStartDate: string;
  seatHoldMinutes: number;
  totalSeatCount: number;
  zones: EventZone[];
}

export interface SeatMapSeat {
  id: number;
  zoneId: number;
  zoneName: string;
  zoneCode: string;
  zoneColorHex: string;
  rowLabel: string;
  seatNumber: number;
  seatCode: string;
  price: number;
  status: SeatStatus;
}

const API_BASE = 'http://localhost:8080/api/events';

export async function getFeaturedEvents(): Promise<FeaturedEvent[]> {
  const res = await fetch(`${API_BASE}/featured`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Cannot load featured events');
  }

  return await res.json();
}

export async function searchPublicEvents(keyword?: string): Promise<UserEventDetail[]> {
  const query = keyword && keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : '';
  const res = await fetch(`${API_BASE}${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Cannot load events');
  }

  return await res.json();
}

export async function getPublicEventDetail(eventId: number): Promise<UserEventDetail> {
  const res = await fetch(`${API_BASE}/${eventId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Cannot load event detail');
  }

  return await res.json();
}

export async function getPublicSeatMap(eventId: number): Promise<SeatMapSeat[]> {
  const res = await fetch(`${API_BASE}/${eventId}/seat-map`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Cannot load seat map');
  }

  return await res.json();
}
