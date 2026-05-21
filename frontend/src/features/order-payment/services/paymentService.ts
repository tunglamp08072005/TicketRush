import { getAuthSession } from '../../auth/utils/authStorage';

export type PaymentStatus = 'UNPAID' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED_PENDING_REFUND' | 'REFUNDED';
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
  refundBankName: string | null;
  refundBankAccountNumber: string | null;
  refundBankAccountHolder: string | null;
  paymentRequestedAt: string | null;
  paymentReviewedAt: string | null;
  createdAt: string;
}

export interface SeatHoldResponse {
  eventId: number;
  seatCodes: string[];
  lockedUntil: string;
  holdMinutes: number;
}

export interface SeatReleaseResponse {
  eventId: number;
  releasedSeatCodes: string[];
}

export interface VnPayCheckoutResponse {
  orderId: number;
  queueId: string;
  totalAmount: number;
  expiresAt: string;
  paymentUrl: string;
}

interface CheckoutPayload {
  eventId: number;
  seatIds: number[];
  paymentProof: File;
  queueToken?: string;
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
      ...(payload.queueToken ? { 'X-Queue-Token': payload.queueToken } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tạo đơn thanh toán');
  }

  return await response.json();
}

export async function createVnPayPayment(eventId: number, seatIds: number[], queueToken?: string): Promise<VnPayCheckoutResponse> {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('Bạn chưa chọn ghế để thanh toán.');
  }

  const formData = new FormData();
  formData.append('eventId', String(eventId));
  formData.append('seatIds', seatIds.join(','));

  const response = await fetch('http://localhost:8080/api/user/payments/vnpay', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(queueToken ? { 'X-Queue-Token': queueToken } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tạo thanh toán VNPAY');
  }

  return await response.json();
}

export async function holdSeatsForPayment(eventId: number, seatIds: number[], queueToken?: string): Promise<SeatHoldResponse> {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('Bạn chưa chọn ghế để giữ chỗ.');
  }

  const formData = new FormData();
  formData.append('eventId', String(eventId));
  formData.append('seatIds', seatIds.join(','));

  const response = await fetch('http://localhost:8080/api/user/payments/hold', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(queueToken ? { 'X-Queue-Token': queueToken } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể giữ ghế');
  }

  return await response.json();
}

export async function releaseHeldSeatsForPayment(eventId: number, seatIds: number[]): Promise<SeatReleaseResponse> {
  const { token } = getAuthSession();
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('Bạn chưa chọn ghế để xóa giữ chỗ.');
  }

  const formData = new FormData();
  formData.append('eventId', String(eventId));
  formData.append('seatIds', seatIds.join(','));

  const response = await fetch('http://localhost:8080/api/user/payments/release-hold', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể xóa giữ ghế');
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

export async function fetchExpiredPendingRefundsForAdmin(): Promise<PaymentOrder[]> {
  const response = await fetch('http://localhost:8080/api/admin/payments/expired-refunds', {
    method: 'GET',
    headers: buildHeaders(true),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể tải danh sách đơn quá hạn cần hoàn tiền');
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

export async function confirmRefund(orderId: number, note?: string): Promise<PaymentOrder> {
  const response = await fetch(`http://localhost:8080/api/admin/payments/${orderId}/confirm-refund`, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify({ note: note ?? null }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể xác nhận hoàn tiền');
  }

  return await response.json();
}

export async function submitRefundBankInfo(
  orderId: number,
  payload: { bankName: string; bankAccountNumber: string; bankAccountHolder: string }
): Promise<PaymentOrder> {
  const response = await fetch(`http://localhost:8080/api/user/payments/${orderId}/refund-bank-info`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Không thể cập nhật thông tin nhận hoàn tiền');
  }

  return await response.json();
}
