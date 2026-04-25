import { useEffect, useMemo, useState } from 'react';
import { fetchAdminUsersOverview, type AdminUserItem, type AdminUsersOverview } from '../services/adminUserService';

type OverviewCardProps = {
  title: string;
  value: number;
  helper: string;
};

function OverviewCard({ title, value, helper }: OverviewCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </article>
  );
}

function roleBadgeClass(role: string): string {
  return role === 'ADMIN'
    ? 'bg-orange-100 text-orange-700 ring-1 ring-orange-200'
    : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
}

export default function AdminUsersOverviewPage() {
  const [overview, setOverview] = useState<AdminUsersOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        const data = await fetchAdminUsersOverview();
        setOverview(data);
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải dữ liệu quản lí người dùng');
        } else {
          setError('Không thể tải dữ liệu quản lí người dùng');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadOverview();
  }, []);

  const completionRate = useMemo(() => {
    if (!overview || overview.totalUsers === 0) {
      return 0;
    }

    return Math.round((overview.completedProfileUsers / overview.totalUsers) * 100);
  }, [overview]);

  const users: AdminUserItem[] = overview?.users ?? [];

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5 shadow-sm">
        <p className="text-sm uppercase tracking-[0.12em] text-orange-600">Quản trị người dùng</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Tổng quan Quản lí người dùng</h1>
        <p className="mt-2 text-sm text-slate-600">
          Theo dõi số lượng tài khoản, mức độ hoàn thiện hồ sơ và danh sách người dùng hiện tại.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600 shadow-sm">
          Đang tải tổng quan người dùng...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewCard
              title="Tổng người dùng"
              value={overview?.totalUsers ?? 0}
              helper="Tất cả tài khoản trong hệ thống"
            />
            <OverviewCard
              title="Tài khoản admin"
              value={overview?.totalAdmins ?? 0}
              helper="Số lượng quản trị viên"
            />
            <OverviewCard
              title="Hồ sơ hoàn chỉnh"
              value={overview?.completedProfileUsers ?? 0}
              helper={`${completionRate}% tổng tài khoản đã có họ tên + SĐT`}
            />
            <OverviewCard
              title="Có số điện thoại"
              value={overview?.usersWithPhoneNumber ?? 0}
              helper="Sẵn sàng cho bước đặt vé"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">Danh sách người dùng</h2>
              <span className="text-xs text-slate-500">{users.length} tài khoản</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Tên đăng nhập</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Vai trò</th>
                    <th className="px-4 py-3">SĐT</th>
                    <th className="px-4 py-3">Hồ sơ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {users.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                        Chưa có người dùng trong hệ thống.
                      </td>
                    </tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">#{user.id}</td>
                        <td className="px-4 py-3">{user.username}</td>
                        <td className="px-4 py-3 text-slate-600">{user.email || 'Chưa cập nhật'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${roleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.hasPhoneNumber ? (
                            <span className="text-emerald-600">Đã có</span>
                          ) : (
                            <span className="text-slate-500">Thiếu</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {user.profileCompleted ? (
                            <span className="text-emerald-600">Hoàn chỉnh</span>
                          ) : (
                            <span className="text-amber-600">Chưa hoàn chỉnh</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
