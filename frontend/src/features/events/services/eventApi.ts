import { getAuthSession } from '../../auth/utils/authStorage';

export type AdminEventStatus = 'UPCOMING' | 'ON_SALE' | 'ENDED';
export type AdminEventCategory = 'NHAC_SONG' | 'SAN_KHAU' | 'THE_THAO' | 'HOI_THAO' | 'TRAI_NGHIEM' | 'KHAC';

export interface AdminEventZone {
  id: number;
  name: string;
  code: string;
  colorHex: string;
  locationDescription: string | null;
  price: number;
  rowCount: number;
  seatsPerRow: number;
  seatCount: number;
}

export interface AdminEvent {
  id: number;
  name: string;
  description: string;
  location: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  layoutMapUrl: string;
  openSaleDate: string;
  saleEndDate: string;
  eventStartDate: string;
  seatHoldMinutes: number;
  category: AdminEventCategory;
  status: AdminEventStatus;
  publicVisible: boolean;
  archived: boolean;
  totalSeatCount: number;
  soldSeatCount: number;
  soldRevenue: number;
  zones: AdminEventZone[];
}

export interface CreateAdminEventZonePayload {
  id?: number;
  name: string;
  price: number;
  rowCount: number;
  seatsPerRow: number;
  colorHex: string;
  locationDescription?: string;
}

export interface CreateAdminEventPayload {
  name: string;
  description: string;
  location: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  layoutMapUrl: string;
  openSaleDate: string;
  saleEndDate: string;
  eventStartDate: string;
  category: AdminEventCategory;
  status?: AdminEventStatus;
  publicVisible?: boolean;
  archived?: boolean;
  zones: CreateAdminEventZonePayload[];
}

const ADMIN_EVENTS_API = 'http://localhost:8080/api/admin/events';

function buildAdminHeaders(contentType = true): HeadersInit {
  const { token, role } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }
  if (role !== 'ADMIN') {
    throw new Error('Bạn không có quyền admin để thực hiện thao tác này.');
  }

  return contentType
    ? {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
    : {
        Authorization: `Bearer ${token}`,
      };
}

export async function fetchAdminEvents(keyword?: string): Promise<AdminEvent[]> {
  const url = new URL(ADMIN_EVENTS_API);
  if (keyword && keyword.trim()) {
    url.searchParams.set('q', keyword.trim());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildAdminHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Cannot fetch events');
  }

  return await response.json();
}

export async function createAdminEvent(data: CreateAdminEventPayload): Promise<AdminEvent> {
  const response = await fetch(ADMIN_EVENTS_API, {
    method: 'POST',
    headers: buildAdminHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Cannot create event');
  }

  return await response.json();
}

export async function updateAdminEvent(id: number, data: CreateAdminEventPayload): Promise<AdminEvent> {
  const response = await fetch(`${ADMIN_EVENTS_API}/${id}`, {
    method: 'PUT',
    headers: buildAdminHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Cannot update event');
  }

  return await response.json();
}

export async function deleteAdminEvent(id: number): Promise<void> {
  const response = await fetch(`${ADMIN_EVENTS_API}/${id}`, {
    method: 'DELETE',
    headers: buildAdminHeaders(false),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Cannot delete event');
  }
}

export async function uploadEventPoster(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${ADMIN_EVENTS_API}/upload-poster`, {
    method: 'POST',
    headers: buildAdminHeaders(false),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Cannot upload poster');
  }

  const data = (await response.json()) as { imageUrl: string };
  if (!data.imageUrl) {
    throw new Error('Upload response missing imageUrl');
  }
  return data.imageUrl;
}

export async function uploadEventLayoutMap(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${ADMIN_EVENTS_API}/upload-layout-map`, {
    method: 'POST',
    headers: buildAdminHeaders(false),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Cannot upload layout map');
  }

  const data = (await response.json()) as { imageUrl: string };
  if (!data.imageUrl) {
    throw new Error('Upload response missing imageUrl');
  }

  return data.imageUrl;
}
