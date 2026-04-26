type SupportHubProps = {
  mode?: 'public' | 'dashboard';
};

const quickActions = [
  {
    title: 'Cần hỗ trợ đặt vé',
    description: 'Kiểm tra trạng thái giữ ghế, thanh toán và lịch mở bán trước khi gửi yêu cầu.',
    actionLabel: 'Gửi email',
    href: 'mailto:support@ticketrush.vn?subject=Ho%20tro%20dat%20ve',
  },
  {
    title: 'Sự cố thanh toán',
    description: 'Đính kèm mã đơn, thời gian chuyển khoản và ảnh minh chứng để đội ngũ xử lý nhanh hơn.',
    actionLabel: 'Báo lỗi thanh toán',
    href: 'mailto:support@ticketrush.vn?subject=Su%20co%20thanh%20toan',
  },
  {
    title: 'Hỗ trợ tài khoản',
    description: 'Dùng khi cần cập nhật hồ sơ, xác minh thông tin hoặc kiểm tra quyền truy cập mua vé.',
    actionLabel: 'Liên hệ CSKH',
    href: 'mailto:support@ticketrush.vn?subject=Ho%20tro%20tai%20khoan',
  },
];

const faqItems = [
  {
    question: 'Tôi đã giữ ghế nhưng chưa thấy trong mục Thanh toán?',
    answer:
      'Hãy làm mới mục Thanh toán trong dashboard. Nếu ghế đã quá thời gian giữ chỗ, hệ thống sẽ tự nhả để người khác tiếp tục mua.',
  },
  {
    question: 'Vì sao tôi chuyển khoản rồi nhưng vé chưa được duyệt?',
    answer:
      'TicketRush đang dùng quy trình xác nhận thanh toán thủ công. Đơn sẽ ở trạng thái chờ duyệt cho tới khi admin kiểm tra ảnh minh chứng.',
  },
  {
    question: 'Tôi có thể đổi ghế sau khi thanh toán không?',
    answer:
      'Hiện tại hệ thống chưa hỗ trợ đổi ghế tự động sau khi đơn đã được xác nhận. Bạn cần liên hệ đội hỗ trợ để được kiểm tra từng trường hợp.',
  },
  {
    question: 'Tôi không tải được ảnh đại diện hoặc ảnh thanh toán?',
    answer:
      'Hãy dùng ảnh định dạng JPG, PNG hoặc WEBP. Nếu môi trường local không bật MinIO, hệ thống hiện sẽ tự lưu ảnh vào local storage của backend.',
  },
];

const supportChannels = [
  { label: 'Email hỗ trợ', value: 'support@ticketrush.vn' },
  { label: 'Hotline', value: '1900 2026' },
  { label: 'Thời gian phản hồi', value: '08:00 - 22:00 mỗi ngày' },
];

export default function SupportHub({ mode = 'public' }: SupportHubProps) {
  const isDashboard = mode === 'dashboard';

  return (
    <section className={isDashboard ? 'text-white' : 'text-slate-100'}>
      <div className={isDashboard ? 'mb-6' : 'mx-auto mb-8 w-full max-w-[1360px] px-4 pt-8'}>
        <div className={`overflow-hidden rounded-[28px] border ${isDashboard ? 'border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.25),_transparent_30%),linear-gradient(135deg,#10131d_0%,#171b29_55%,#0f172a_100%)]' : 'border-white/12 bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.26),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_24%),linear-gradient(135deg,#111827_0%,#1f2937_45%,#0f172a_100%)]'} p-6 shadow-[0_24px_60px_rgba(15,23,42,0.38)] md:p-8`}>
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.9fr]">
            <div>
              <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${isDashboard ? 'text-orange-300/90' : 'text-orange-200/90'}`}>
                TicketRush Support Center
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-white md:text-5xl">
                Hỗ trợ nhanh cho đặt vé, thanh toán và tài khoản.
              </h1>
              <p className={`mt-4 max-w-2xl text-sm leading-7 ${isDashboard ? 'text-slate-300' : 'text-slate-200/90'}`}>
                Nếu bạn đang gặp lỗi khi giữ ghế, chưa thấy đơn thanh toán hoặc cần xác minh tài khoản trước giờ mở bán, đây là nơi tập trung các kênh hỗ trợ và câu hỏi thường gặp.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="mailto:support@ticketrush.vn?subject=Yeu%20cau%20ho%20tro%20TicketRush"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-400"
                >
                  Gửi yêu cầu hỗ trợ
                </a>
                <a
                  href="tel:19002026"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Gọi hotline 1900 2026
                </a>
              </div>
            </div>

            <aside className="grid gap-3 self-start rounded-[24px] border border-white/10 bg-black/20 p-5 backdrop-blur">
              {supportChannels.map(channel => (
                <div key={channel.label} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{channel.label}</p>
                  <p className="mt-1 text-base font-semibold text-white">{channel.value}</p>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>

      <div className={isDashboard ? 'grid gap-6 xl:grid-cols-[1.05fr_0.95fr]' : 'mx-auto grid w-full max-w-[1360px] gap-6 px-4 pb-12 xl:grid-cols-[1.05fr_0.95fr]'}>
        <div className="grid gap-6">
          <section className={`rounded-[24px] border p-6 ${isDashboard ? 'border-gray-800 bg-gray-900/85' : 'border-white/8 bg-slate-950/86'}`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Hành động nhanh</h2>
                <p className="mt-1 text-sm text-slate-400">Chọn đúng nhóm vấn đề để gửi yêu cầu gọn hơn.</p>
              </div>
            </div>

            <div className="grid gap-4">
              {quickActions.map(item => (
                <article key={item.title} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                  <a
                    href={item.href}
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-orange-400/40 bg-orange-500/12 px-4 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20"
                  >
                    {item.actionLabel}
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section className={`rounded-[24px] border p-6 ${isDashboard ? 'border-gray-800 bg-gray-900/85' : 'border-white/8 bg-slate-950/86'}`}>
            <h2 className="text-2xl font-bold text-white">Cần chuẩn bị gì khi gửi hỗ trợ?</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">1. Mã đơn / mã vé</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Nếu có `queueId` hoặc mã đơn, hãy gửi ngay trong tiêu đề hoặc nội dung email.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">2. Ảnh minh chứng</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Đính kèm ảnh lỗi, ảnh chuyển khoản hoặc ảnh giao diện để đội kỹ thuật đối chiếu nhanh.</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">3. Thời điểm xảy ra lỗi</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Ghi rõ ngày giờ và thao tác bạn vừa làm để tránh phải hỏi lại nhiều lần.</p>
              </div>
            </div>
          </section>
        </div>

        <section className={`rounded-[24px] border p-6 ${isDashboard ? 'border-gray-800 bg-gray-900/85' : 'border-white/8 bg-slate-950/86'}`}>
          <h2 className="text-2xl font-bold text-white">Câu hỏi thường gặp</h2>
          <p className="mt-2 text-sm text-slate-400">Các vấn đề này là nhóm lỗi xuất hiện nhiều nhất trong luồng mua vé hiện tại.</p>

          <div className="mt-5 space-y-3">
            {faqItems.map(item => (
              <details key={item.question} className="group rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-slate-300">
                <summary className="cursor-pointer list-none pr-6 text-base font-semibold text-white">
                  {item.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
