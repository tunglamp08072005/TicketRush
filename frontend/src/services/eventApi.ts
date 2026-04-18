export type AdminEventStatus = 'UPCOMING' | 'ON_SALE' | 'ENDED';

export interface AdminEvent {
  id: number;
  name: string;
  description: string;
  location: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  openSaleDate: string;
  status: AdminEventStatus;
}

export interface CreateAdminEventPayload {
  name: string;
  description: string;
  location: string;
  heroImageUrl: string;
  thumbnailUrl: string;
  openSaleDate: string;
  status?: AdminEventStatus;
}

const ADMIN_EVENTS_API = 'http://localhost:8080/api/admin/events';

export async function fetchAdminEvents(): Promise<AdminEvent[]> {
  const response = await fetch(ADMIN_EVENTS_API, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
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
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Cannot create event');
  }

  return await response.json();
}

export async function uploadEventPoster(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${ADMIN_EVENTS_API}/upload-poster`, {
    method: 'POST',
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
