import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './EventPaymentPage.css';

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const success = searchParams.get('success') === 'true';
  const orderId = searchParams.get('orderId') || '';
  const queueId = searchParams.get('queueId') || '';
  const message = searchParams.get('message') || (success ? 'Thanh toán VNPAY thành công' : 'Thanh toán VNPAY thất bại');

  const title = useMemo(() => {
    return success ? 'Thanh toán thành công' : 'Thanh toán chưa hoàn tất';
  }, [success]);

  return (
    <main className="event-payment-page">
      <div className="event-payment-overlay">
        <section className="event-payment-card">
          <header className="event-payment-header">
            <h1>Kết quả thanh toán</h1>
          </header>

          <div className="event-payment-success">
            <h2>{title}</h2>
            <p>{message}</p>
            {orderId ? <p>Mã đơn: <strong>#{orderId}</strong></p> : null}
            {queueId ? <p>Mã giao dịch: <strong>{queueId}</strong></p> : null}
            <p>
              {success
                ? 'Vé của bạn đã được xác nhận và có thể xem trong mục Vé của tôi.'
                : 'Nếu tiền đã bị trừ, vui lòng kiểm tra lại lịch sử thanh toán hoặc liên hệ hỗ trợ.'}
            </p>

            <div className="event-payment-action-row">
              <button
                type="button"
                className="event-payment-primary"
                onClick={() => navigate('/user', { state: { activeMenu: success ? 'tickets' : 'payments' } })}
              >
                {success ? 'Về Vé của tôi' : 'Về mục thanh toán'}
              </button>
              <button
                type="button"
                className="event-payment-primary"
                onClick={() => navigate('/user', { state: { activeMenu: 'events' } })}
              >
                Về danh sách sự kiện
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
