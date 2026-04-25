import { getAuthSession } from '../../auth/utils/authStorage';

export interface AdminUserItem {
  id: number;
  username: string;
  email: string | null;
  role: 'ADMIN' | 'USER' | string;
  profileCompleted: boolean;
  hasPhoneNumber: boolean;
}

export interface AdminUsersOverview {
  totalUsers: number;
  totalAdmins: number;
  totalStandardUsers: number;
  completedProfileUsers: number;
  usersWithPhoneNumber: number;
  users: AdminUserItem[];
}

export async function fetchAdminUsersOverview(): Promise<AdminUsersOverview> {
  const { token, role } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }
  if (role !== 'ADMIN') {
    throw new Error('Bạn không có quyền truy cập trang quản lí người dùng.');
  }

  const response = await fetch('http://localhost:8080/api/admin/users/overview', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tải tổng quan người dùng');
  }

  return await response.json();
}
