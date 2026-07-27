import { TabBar } from "@/components/nav/TabBar";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { SyncIndicator } from "@/components/ui/SyncIndicator";
import { InstallPrompt } from "@/components/InstallPrompt";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-4">
        <OfflineBanner />
        <SyncIndicator />
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <TabBar />
      <InstallPrompt />
    </div>
  );
}
