import { getAuthSession } from '../utils/authStorage';

export type PaymentStatus = 'UNPAID' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface PaymentOrder {
  orderId: number;
  queueId: string;
  eventId: number;
  eventName: string;
  userId: number;
  username: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  seatCodes: string[];
  paymentNote: string | null;
  paymentProofImageUrl: string | null;
  paymentRequestedAt: string | null;
  paymentReviewedAt: string | null;
  createdAt: string;
}

interface CheckoutPayload {
  eventId: number;
  seatIds: number[];
  paymentProof: File;
}

function buildHeaders(requireAdmin = false): HeadersInit {
  const { token, role } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }
  if (requireAdmin && role !== 'ADMIN') {
    throw new Error('Bạn không có quyền admin để thực hiện thao tác này.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function checkoutPayment(payload: CheckoutPayload): Promise<PaymentOrder> {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  const formData = new FormData();
  formData.append('eventId', String(payload.eventId));
  formData.append('seatIds', payload.seatIds.join(','));
  formData.append('paymentProof', payload.paymentProof);

  const response = await fetch('http://localhost:8080/api/user/payments/checkout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tạo đơn thanh toán');
  }

  return await response.json();
}

export async function fetchMyPayments(): Promise<PaymentOrder[]> {
  const response = await fetch('http://localhost:8080/api/user/payments', {
    method: 'GET',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tải lịch sử thanh toán');
  }

  return await response.json();
}

export async function fetchPendingPaymentsForAdmin(): Promise<PaymentOrder[]> {
  const response = await fetch('http://localhost:8080/api/admin/payments', {
    method: 'GET',
    headers: buildHeaders(true),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tải danh sách duyệt thanh toán');
  }

  return await response.json();
}

export async function approvePayment(orderId: number, note?: string): Promise<PaymentOrder> {
  const response = await fetch(`http://localhost:8080/api/admin/payments/${orderId}/approve`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ note: note ?? null }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể duyệt thanh toán');
  }

  return await response.json();
}

export async function rejectPayment(orderId: number, note?: string): Promise<PaymentOrder> {
  const response = await fetch(`http://localhost:8080/api/admin/payments/${orderId}/reject`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ note: note ?? null }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể từ chối thanh toán');
  }

  return await response.json();
}
