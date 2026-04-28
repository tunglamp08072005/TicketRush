import { getAuthSession } from '../../auth/utils/authStorage';

const API_URL = 'http://localhost:8080/api/user/profile/notification-preferences';

export interface NotificationPreferences {
  emailNotificationEnabled: boolean;
  systemNotificationEnabled: boolean;
}

export interface UpdateNotificationPreferencesPayload {
  emailNotificationEnabled?: boolean;
  systemNotificationEnabled?: boolean;
}

function buildAuthHeaders(): HeadersInit {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await fetch(API_URL, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Không thể tải cài đặt thông báo');
  }

  return await res.json();
}

export async function updateNotificationPreferences(
  payload: UpdateNotificationPreferencesPayload
): Promise<NotificationPreferences> {
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Không thể cập nhật cài đặt thông báo');
  }

  return await res.json();
}
