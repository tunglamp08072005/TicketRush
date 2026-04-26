const integrations = [
  {
    title: 'MinIO / Local Upload',
    description: 'Lưu ảnh poster, sơ đồ ghế, avatar và minh chứng thanh toán.',
    hint: 'Nếu MinIO tắt, backend sẽ fallback sang local storage.',
  },
  {
    title: 'RabbitMQ',
    description: 'Dùng cho queue flash-sale để xử lý đơn đặt vé theo nhịp an toàn.',
    hint: 'Cần chạy ổn định trước các đợt mở bán lưu lượng lớn.',
  },
  {
    title: 'Redis',
    description: 'Quản lý giữ ghế tạm thời, queue status và nhịp điều tiết flash-sale.',
    hint: 'Nếu Redis lỗi, trải nghiệm giữ ghế sẽ mất tính đồng bộ.',
  },
  {
    title: 'WebSocket',
    description: 'Đồng bộ trạng thái ghế theo thời gian thực cho người đang chọn chỗ.',
    hint: 'Frontend hiện đã có polling hỗ trợ fallback ở màn hình đặt ghế.',
  },
];

const operationChecklist = [
  'Xác nhận PostgreSQL, Redis và RabbitMQ đang chạy trước khi demo.',
  'Nếu cần upload ảnh thật, kiểm tra MinIO hoặc local-upload fallback đang hoạt động.',
  'Rà soát lại sự kiện nào đang Public, sự kiện nào cần Archive để tránh lộ dữ liệu test.',
  'Kiểm tra danh sách thanh toán chờ duyệt để không bỏ sót đơn của user.',
];

const releaseNotes = [
  {
    title: 'Môi trường local',
    description: 'Ưu tiên dùng cấu hình mặc định trong `application.properties` để đội dễ đồng bộ.',
  },
  {
    title: 'Quy trình deploy',
    description: 'Nên chốt trên nhánh feature, tạo PR vào `develop`, review xong mới merge.',
  },
  {
    title: 'Theo dõi sau demo',
    description: 'Nếu user báo đơn bị từ chối hoặc pending quá lâu, admin cần vào mục Duyệt thanh toán để phản hồi.',
  },
];

export default function AdminSettingsPage() {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#f8fafc_100%)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">Cài đặt hệ thống</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">Thiết lập vận hành TicketRush</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Trang này dành cho việc kiểm tra trạng thái tích hợp, quy ước môi trường và checklist trước khi demo hoặc chạy đợt mở bán.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        {integrations.map(item => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Đã cấu hình
              </span>
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">{item.hint}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Checklist trước khi chạy</h2>
          <div className="mt-4 space-y-3">
            {operationChecklist.map(item => (
              <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  ✓
                </span>
                <p className="text-sm leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Ghi chú phát hành</h2>
          <div className="mt-4 space-y-3">
            {releaseNotes.map(item => (
              <article key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4">
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
