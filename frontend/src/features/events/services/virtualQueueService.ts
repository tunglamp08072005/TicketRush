import { getAuthSession } from '../../auth/utils/authStorage';

export type VirtualQueueStatus = 'WAITING' | 'ADMITTED' | 'EXPIRED' | 'DISABLED';

export interface VirtualQueueStatusResponse {
  eventId: number;
  queueToken: string | null;
  status: VirtualQueueStatus;
  position: number | null;
  batchSize: number;
  message: string;
  admittedUntilEpochMs: number | null;
  estimatedWaitSeconds: number | null;
}

const API_BASE = 'http://localhost:8080/api/virtual-queue/events';
const inFlightEnterRequests = new Map<number, Promise<VirtualQueueStatusResponse>>();

function buildAuthHeaders(): HeadersInit {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function enterVirtualQueue(eventId: number): Promise<VirtualQueueStatusResponse> {
  const existing = inFlightEnterRequests.get(eventId);
  if (existing) {
    return await existing;
  }

  const request = (async () => {
    const response = await fetch(`${API_BASE}/${eventId}/enter`, {
      method: 'POST',
      headers: buildAuthHeaders(),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Không thể vào phòng chờ.');
    }

    return await response.json();
  })();

  inFlightEnterRequests.set(eventId, request);
  try {
    return await request;
  } finally {
    inFlightEnterRequests.delete(eventId);
  }
}

export async function getVirtualQueueStatus(eventId: number, queueToken: string): Promise<VirtualQueueStatusResponse> {
  const response = await fetch(`${API_BASE}/${eventId}/status/${encodeURIComponent(queueToken)}`, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tải trạng thái phòng chờ.');
  }

  return await response.json();
}

export async function heartbeatVirtualQueue(eventId: number, queueToken: string): Promise<VirtualQueueStatusResponse> {
  const response = await fetch(`${API_BASE}/${eventId}/heartbeat/${encodeURIComponent(queueToken)}`, {
    method: 'POST',
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể gia hạn phiên phòng chờ.');
  }

  return await response.json();
}

export function sendVirtualQueueReleaseBeacon(eventId: number, queueToken: string): void {
  if (!Number.isFinite(eventId) || !queueToken) {
    return;
  }

  const url = `${API_BASE}/${eventId}/beacon-release/${encodeURIComponent(queueToken)}`;
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(url, 'release');
    return;
  }

  void fetch(url, {
    method: 'POST',
    keepalive: true,
  });
}
