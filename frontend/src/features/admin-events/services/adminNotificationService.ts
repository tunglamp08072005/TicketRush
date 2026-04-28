import { getAuthSession } from '../../auth/utils/authStorage';

const API_URL = 'http://localhost:8080/api/admin/notifications';

/**
 * Build auth headers with JWT token - same pattern as notificationPreferenceService
 */
function buildAuthHeaders(): HeadersInit {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phien dang nhap da het. Vui long dang nhap lai.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'payment_pending' | 'payment_review' | 'event_alert' | 'system';
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  actionUrl?: string;
}

export interface AdminNotificationStats {
  total: number;
  unread: number;
  byType: {
    payment_pending: number;
    payment_review: number;
    event_alert: number;
    system: number;
  };
}

/**
 * Lấy danh sách thông báo admin
 */
export async function getAdminNotifications(limit: number = 20): Promise<AdminNotification[]> {
  try {
    const res = await fetch(`${API_URL}?limit=${limit}`, {
      method: 'GET',
      headers: buildAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Unauthorized: Phiên làm việc hết hạn hoặc thiếu quyền Admin');
      }
      const error = await res.text();
      throw new Error(error || 'Failed to fetch admin notifications');
    }

    const data = await res.json();
    return Array.isArray(data)
      ? data.map((n: any) => ({
          ...n,
          createdAt: n.createdAt || new Date().toISOString(),
        }))
      : [];
  } catch (err) {
    console.error('Error fetching admin notifications:', err);
    return [];
  }
}

/**
 * Lấy thống kê số lượng thông báo
 */
export async function getAdminNotificationStats(): Promise<AdminNotificationStats> {
  try {
    const res = await fetch(`${API_URL}/stats`, {
      method: 'GET',
      headers: buildAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error('Failed to fetch notification stats');
    }

    return await res.json();
  } catch (err) {
    console.error('Error fetching notification stats:', err);
    return {
      total: 0,
      unread: 0,
      byType: {
        payment_pending: 0,
        payment_review: 0,
        event_alert: 0,
        system: 0,
      },
    };
  }
}

/**
 * Đánh dấu thông báo là đã đọc
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/${notificationId}/read`, {
      method: 'PUT',
      headers: buildAuthHeaders(),
    });

    return res.ok;
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return false;
  }
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/read-all`, {
      method: 'PUT',
      headers: buildAuthHeaders(),
    });

    return res.ok;
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return false;
  }
}

/**
 * Lấy tổng số lượng thanh toán đang chờ xử lý (cho badge)
 */
export async function getPendingPaymentCount(): Promise<number> {
  try {
    const stats = await getAdminNotificationStats();
    return (stats.byType?.payment_pending || 0) + (stats.byType?.payment_review || 0);
  } catch (err) {
    console.error('Error getting pending payment count:', err);
    return 0;
  }
}