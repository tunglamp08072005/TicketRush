import { useEffect, useState } from 'react';
import {
  approvePayment,
  confirmRefund,
  fetchExpiredPendingRefundsForAdmin,
  fetchPendingPaymentsForAdmin,
  rejectPayment,
  type PaymentOrder,
} from '../services/paymentService';

type AdminPaymentTab = 'pending' | 'expiredRefund';

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
  const [expiredRefundPayments, setExpiredRefundPayments] = useState<PaymentOrder[]>([]);
  const [activeTab, setActiveTab] = useState<AdminPaymentTab>('pending');
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [paymentError, setPaymentError] = useState('');
  const [processingPaymentId, setProcessingPaymentId] = useState<number | null>(null);

  const loadPendingPayments = async () => {
    try {
      setLoadingPayments(true);
      const [pendingData, expiredRefundData] = await Promise.all([
        fetchPendingPaymentsForAdmin(),
        fetchExpiredPendingRefundsForAdmin(),
      ]);
      setPendingPayments(pendingData);
      setExpiredRefundPayments(expiredRefundData);
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

  const handleConfirmRefund = async (orderId: number) => {
    const note = window.prompt('Ghi chú hoàn tiền (ví dụ: mã giao dịch chuyển khoản):') || undefined;
    try {
      setProcessingPaymentId(orderId);
      await confirmRefund(orderId, note);
      await loadPendingPayments();
    } catch (err) {
      if (err instanceof Error) {
        setPaymentError(err.message || 'Không thể xác nhận hoàn tiền');
      } else {
        setPaymentError('Không thể xác nhận hoàn tiền');
      }
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const visiblePayments = activeTab === 'pending' ? pendingPayments : expiredRefundPayments;

  return (
    <div className="mx-auto w-full max-w-[1400px] font-sans text-slate-800">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#0f172a]">Duyệt thanh toán</h1>
          <p className="mt-2 text-sm text-slate-500">Theo dõi đơn chờ duyệt và các đơn quá hạn cần hoàn tiền.</p>
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

        <div className="mb-5 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'pending' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Chờ duyệt ({pendingPayments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expiredRefund')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'expiredRefund' ? 'bg-red-600 text-white shadow-sm' : 'text-red-600 hover:text-red-700'}`}
          >
            Đơn quá hạn cần hoàn tiền ({expiredRefundPayments.length})
          </button>
        </div>

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
              ) : visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {activeTab === 'pending' ? 'Không có đơn hàng nào đang chờ duyệt.' : 'Không có đơn quá hạn cần hoàn tiền.'}
                  </td>
                </tr>
              ) : (
                visiblePayments.map(order => (
                  <tr key={order.orderId} className={`border-t border-slate-200 hover:bg-slate-50 ${activeTab === 'expiredRefund' ? 'bg-red-50/50' : ''}`}>
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
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <p>{formatCurrency(order.totalAmount)}</p>
                      {activeTab === 'expiredRefund' && (
                        <p className="mt-1 text-xs font-normal text-slate-600">
                          {order.refundBankName && order.refundBankAccountNumber && order.refundBankAccountHolder
                            ? `${order.refundBankName} - ${order.refundBankAccountNumber} (${order.refundBankAccountHolder})`
                            : 'Chua co thong tin tai khoan nhan hoan tien'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{order.paymentRequestedAt ? formatDate(order.paymentRequestedAt) : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {activeTab === 'pending' ? (
                          <>
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
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={processingPaymentId === order.orderId}
                            onClick={() => handleConfirmRefund(order.orderId)}
                            className="rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                          >
                            Xác nhận đã hoàn tiền
                          </button>
                        )}
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
