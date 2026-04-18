export type EventStatus = 'UPCOMING' | 'ON_SALE' | 'ENDED';

export interface FeaturedEvent {
  id: number;
  name: string;
  description: string;
  location: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  openSaleDate: string;
  status: EventStatus;
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
