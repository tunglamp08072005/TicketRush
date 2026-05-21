import { ChevronDown, Mail, UploadCloud } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  submitSupportRequest,
  type SupportIssueType,
} from '../services/supportService';

type SupportHubProps = {
  mode?: 'public' | 'dashboard';
};

type FaqItem = {
  question: string;
  answer: string;
};

type SupportLocationState = {
  supportTitle?: string;
  supportContent?: string;
  issueType?: SupportIssueType;
};

const SUPPORT_EMAIL = 'dangkhuat50@gmail.com';

const issueTypes: Array<{ value: SupportIssueType; label: string }> = [
  { value: 'payment', label: 'Lỗi thanh toán' },
  { value: 'account', label: 'Lỗi tài khoản' },
  { value: 'ticket', label: 'Vấn đề về vé' },
  { value: 'feedback', label: 'Góp ý' },
  { value: 'other', label: 'Khác' },
];

const faqItems: FaqItem[] = [
  {
    question: 'Tôi đã thanh toán nhưng chưa nhận được vé thì làm sao?',
    answer:
      'Vui lòng kiểm tra mục Vé của tôi và trạng thái đơn trong Thanh toán. Nếu đơn vẫn chưa được duyệt, hãy gửi form hỗ trợ kèm mã đơn và ảnh chuyển khoản để đội ngũ TicketRush đối chiếu.',
  },
  {
    question: 'Chính sách hoàn/hủy vé của TicketRush như thế nào?',
    answer:
      'TicketRush xử lý hoàn hoặc hủy vé theo chính sách của từng sự kiện. Bạn nên gửi yêu cầu kèm mã đơn, tên sự kiện và lý do cần hoàn/hủy để được kiểm tra cụ thể.',
  },
  {
    question: 'Làm thế nào để xuất trình vé tại sự kiện?',
    answer:
      'Sau khi đơn được xác nhận, vé sẽ hiển thị trong mục Vé của tôi. Khi đến sự kiện, bạn mở vé và xuất trình mã QR hoặc thông tin vé cho bộ phận check-in.',
  },
];

export default function SupportHub({ mode = 'public' }: SupportHubProps) {
  const isDashboard = mode === 'dashboard';
  const location = useLocation();
  const prefill = (location.state || {}) as SupportLocationState;
  const [issueType, setIssueType] = useState<SupportIssueType>(prefill.issueType ?? 'payment');
  const [title, setTitle] = useState(prefill.supportTitle ?? '');
  const [content, setContent] = useState(prefill.supportContent ?? '');
  const [contactEmail, setContactEmail] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const contentHint = useMemo(() => `${content.trim().length}/4000`, [content]);
  const containerClass = isDashboard ? 'mb-6' : 'mx-auto w-full max-w-[1180px] px-4 py-10';
  const panelClass = isDashboard
    ? 'border-gray-800 bg-gray-900/85'
    : 'border-white/8 bg-slate-950/86';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (title.trim().length < 5) {
      setStatus({ type: 'error', message: 'Tiêu đề cần tối thiểu 5 ký tự.' });
      return;
    }
    if (content.trim().length < 20) {
      setStatus({ type: 'error', message: 'Nội dung cần tối thiểu 20 ký tự.' });
      return;
    }
    if (evidence && !['image/jpeg', 'image/png', 'image/webp'].includes(evidence.type)) {
      setStatus({ type: 'error', message: 'Ảnh minh chứng chỉ hỗ trợ JPG, PNG hoặc WEBP.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await submitSupportRequest({
        issueType,
        title: title.trim(),
        content: content.trim(),
        contactEmail: contactEmail.trim(),
        evidence,
      });
      setStatus({ type: 'success', message });
      setTitle('');
      setContent('');
      setContactEmail('');
      setEvidence(null);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Không thể gửi yêu cầu hỗ trợ.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={isDashboard ? 'support-hub support-hub-dashboard text-white' : 'support-hub text-slate-100'}>
      <div className={containerClass}>
        <div
          className={`mb-6 overflow-hidden rounded-[24px] border p-6 shadow-[0_24px_60px_rgba(15,23,42,0.34)] md:p-8 ${
            isDashboard
              ? 'border-white/10 bg-[linear-gradient(135deg,#10131d_0%,#151a28_58%,#0f172a_100%)]'
              : 'border-white/12 bg-[linear-gradient(135deg,#111827_0%,#1f2937_52%,#0f172a_100%)]'
          }`}
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300/90">
                TicketRush Support
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-white md:text-4xl">
                Gửi yêu cầu hỗ trợ
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Mô tả sự cố ngay trên giao diện. Nếu đã đăng nhập, hệ thống sẽ tự gửi kèm thông tin tài khoản
                để đội ngũ TicketRush kiểm tra nhanh hơn.
              </p>
            </div>

            <aside className="rounded-[20px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-200">
                  <Mail size={20} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Email nhận hỗ trợ
                  </p>
                  <p className="mt-2 break-words text-lg font-bold text-white">{SUPPORT_EMAIL}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Form bên dưới sẽ gửi yêu cầu trực tiếp đến email này.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} className={`rounded-[24px] border p-6 ${panelClass}`}>
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-white">Thông tin yêu cầu</h2>
              <p className="mt-1 text-sm text-slate-400">
                Điền càng rõ ràng thì thời gian kiểm tra càng nhanh.
              </p>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Loại sự cố</span>
                <select
                  value={issueType}
                  onChange={event => setIssueType(event.target.value as SupportIssueType)}
                  className="min-h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition focus:border-orange-400"
                >
                  {issueTypes.map(item => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Email liên hệ</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={event => setContactEmail(event.target.value)}
                  placeholder="Nhập nếu muốn nhận phản hồi qua email khác"
                  className="min-h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Tiêu đề</span>
                <input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Ví dụ: Đã thanh toán nhưng chưa thấy vé"
                  className="min-h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-200">Nội dung chi tiết</span>
                <textarea
                  value={content}
                  onChange={event => setContent(event.target.value)}
                  maxLength={4000}
                  rows={7}
                  placeholder="Mô tả thao tác bạn đã thực hiện, thời điểm xảy ra lỗi, mã đơn hoặc tên sự kiện nếu có."
                  className="resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-orange-400"
                />
                <span className="text-right text-xs text-slate-500">{contentHint}</span>
              </label>

              <label className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 transition hover:border-orange-400/60">
                <span className="flex items-center gap-3 text-sm font-semibold text-slate-200">
                  <UploadCloud size={20} className="text-orange-200" aria-hidden="true" />
                  Ảnh minh chứng
                </span>
                <span className="text-sm leading-6 text-slate-400">
                  {evidence ? evidence.name : 'Chọn ảnh chụp màn hình lỗi hoặc ảnh chuyển khoản. Hỗ trợ JPG, PNG, WEBP.'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={event => setEvidence(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>

              {status && (
                <p
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    status.type === 'success'
                      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                      : 'border-red-400/30 bg-red-500/10 text-red-200'
                  }`}
                >
                  {status.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail size={18} aria-hidden="true" />
                {isSubmitting ? 'Đang gửi...' : 'Gửi email hỗ trợ'}
              </button>
            </div>
          </form>

          <section className={`rounded-[24px] border p-6 ${panelClass}`}>
            <h2 className="text-2xl font-bold text-white">Câu hỏi thường gặp</h2>
            <p className="mt-2 text-sm text-slate-400">
              Kiểm tra nhanh các tình huống phổ biến trước khi gửi yêu cầu.
            </p>

            <div className="mt-5 space-y-3">
              {faqItems.map(item => (
                <details key={item.question} className="group rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-slate-300">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                    <span>{item.question}</span>
                    <ChevronDown
                      size={18}
                      className="shrink-0 text-slate-400 transition group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
