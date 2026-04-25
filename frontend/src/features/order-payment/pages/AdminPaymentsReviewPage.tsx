import { useEffect, useState } from 'react';
import {
  approvePayment,
  fetchPendingPaymentsForAdmin,
  rejectPayment,
  type PaymentOrder,
} from '../services/paymentService';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return `${value.toLocaleString('vi-VN')} VND`;
}

export default function AdminPaymentsReviewPage() {
  const [pendingPayments, setPendingPayments] = useState<PaymentOrder[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState('');
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null);

  const loadPendingPayments = async () => {
    try {
      setLoadingPayments(true);
      const data = await fetchPendingPaymentsForAdmin();
      setPendingPayments(data);
      setPaymentError('');
    } catch (err) {
      if (err instanceof Error) {
        setPaymentError(err.message || 'Không thể tải danh sách thanh toán chờ duyệt');
      } else {
        setPaymentError('Không thể tải danh sách thanh toán chờ duyệt');
      }
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    void loadPendingPayments();
  }, []);

  const handleApprovePayment = async (orderId: number) => {
    const note = window.prompt('Ghi chú duyệt (không bắt buộc):') || undefined;
    try {
      setProcessingPaymentId(orderId);
      await approvePayment(orderId, note);
      await loadPendingPayments();
    } catch (err) {
      if (err instanceof Error) {
        setPaymentError(err.message || 'Không thể duyệt thanh toán');
      } else {
        setPaymentError('Không thể duyệt thanh toán');
      }
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async (orderId: number) => {
    const note = window.prompt('Lý do từ chối (không bắt buộc):') || undefined;
    try {
      setProcessingPaymentId(orderId);
      await rejectPayment(orderId, note);
      await loadPendingPayments();
    } catch (err) {
      if (err instanceof Error) {
        setPaymentError(err.message || 'Không thể từ chối thanh toán');
      } else {
        setPaymentError('Không thể từ chối thanh toán');
      }
    } finally {
      setProcessingPaymentId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] font-sans text-slate-800">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#0f172a]">Duyệt thanh toán</h1>
          <p className="mt-2 text-sm text-slate-500">Danh sách đơn hàng người dùng đã gửi thanh toán và đang chờ admin xác nhận.</p>
        </div>

        <button
          type="button"
          onClick={loadPendingPayments}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
        >
          Làm mới
        </button>
      </header>

      <section className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
        {paymentError && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{paymentError}</p>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
              <tr>
                <th className="px-4 py-3">Đơn hàng</th>
                <th className="px-4 py-3">Người mua</th>
                <th className="px-4 py-3">Sự kiện</th>
                <th className="px-4 py-3">Ghế</th>
                <th className="px-4 py-3">Ảnh chuyển khoản</th>
                <th className="px-4 py-3">Tổng tiền</th>
                <th className="px-4 py-3">Thời gian gửi</th>
                <th className="px-4 py-3">Tác vụ</th>
              </tr>
            </thead>
            <tbody>
              {loadingPayments ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Đang tải danh sách chờ duyệt...
                  </td>
                </tr>
              ) : pendingPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Không có đơn hàng nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                pendingPayments.map(order => (
                  <tr key={order.orderId} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">#{order.orderId}</td>
                    <td className="px-4 py-3 text-slate-600">{order.username}</td>
                    <td className="px-4 py-3 text-slate-600">{order.eventName}</td>
                    <td className="px-4 py-3 text-slate-600">{order.seatCodes.join(', ')}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.paymentProofImageUrl ? (
                        <a href={order.paymentProofImageUrl} target="_blank" rel="noreferrer" className="inline-block">
                          <img
                            src={order.paymentProofImageUrl}
                            alt={`Minh chứng chuyển khoản đơn #${order.orderId}`}
                            className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                          />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{order.paymentRequestedAt ? formatDate(order.paymentRequestedAt) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={processingPaymentId === order.orderId}
                          onClick={() => handleApprovePayment(order.orderId)}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Duyệt
                        </button>
                        <button
                          type="button"
                          disabled={processingPaymentId === order.orderId}
                          onClick={() => handleRejectPayment(order.orderId)}
                          className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          Từ chối
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
