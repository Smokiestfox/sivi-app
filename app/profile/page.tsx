import SiteHeader from '@/components/SiteHeader';
import ProfileDashboard from '@/components/ProfileDashboard';

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#18352d]">
      <SiteHeader />
      <ProfileDashboard />
    </main>
  );
}
