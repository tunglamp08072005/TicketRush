import GuestHeader from '../../../components/guest/GuestHeader';
import SupportHub from '../components/SupportHub';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#050816_0%,#0f172a_100%)]">
      <GuestHeader activeTab="support" />
      <SupportHub mode="public" />
    </div>
  );
}
