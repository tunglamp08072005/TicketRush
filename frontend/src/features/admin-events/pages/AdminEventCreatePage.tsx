import { useNavigate } from 'react-router-dom';
import AddEventForm from '../components/admin/AddEventForm';

export default function AdminEventCreatePage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-[1400px] font-sans text-slate-800">
      <section className="rounded-2xl border border-white/70 bg-slate-50/95 p-4 shadow-sm backdrop-blur md:p-6">
        <AddEventForm
          onCancel={() => navigate('/admin/events')}
          onCreated={() => navigate('/admin/events')}
        />
      </section>
    </div>
  );
}
