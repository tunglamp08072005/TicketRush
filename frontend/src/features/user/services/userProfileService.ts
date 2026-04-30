import { getAuthSession } from '../../auth/utils/authStorage';

const API_URL = 'http://localhost:8080/api/user/profile';

export interface UserProfile {
  username: string;
  email: string;
  role: string;
  profile: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  gender: string | null;
  birthday: string | null;
  loginProvider?: string;
}

export interface UpdateUserProfilePayload {
  email?: string;
  profile: string;
  avatarUrl?: string;
  phoneNumber: string;
  gender?: string;
  birthday?: string;
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

export async function getMyProfile(): Promise<UserProfile> {
  const res = await fetch(API_URL, {
    method: 'GET',
    headers: buildAuthHeaders(),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Không thể tải hồ sơ');
  }

  return await res.json();
}

export async function updateMyProfile(payload: UpdateUserProfilePayload): Promise<UserProfile> {
  const res = await fetch(API_URL, {
    method: 'PUT',
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Không thể cập nhật hồ sơ');
  }

  return await res.json();
}

export async function uploadMyAvatar(file: File): Promise<UserProfile> {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Không thể tải ảnh đại diện');
  }

  return await res.json();
}
