import { TabBar } from "@/components/nav/TabBar";
import { PullToRefresh } from "@/components/ui/PullToRefresh";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <TabBar />
    </div>
  );
}
