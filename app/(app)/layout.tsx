import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/nav/TabBar";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { SyncIndicator } from "@/components/ui/SyncIndicator";
import { InstallPrompt } from "@/components/InstallPrompt";
import { UndoToastProvider } from "@/components/ui/UndoToastProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("onboarding_completed")
    .maybeSingle();

  // A brand-new account goes through first-run setup before anything else. The
  // check reads the current path from the header Next sets on every request,
  // so /welcome itself doesn't redirect to itself.
  const pathname = (await headers()).get("x-current-path") ?? "";
  if (settings && !settings.onboarding_completed && !pathname.startsWith("/welcome")) {
    redirect("/welcome");
  }

  return (
    <UndoToastProvider>
      <div className="min-h-screen pb-20">
        <div className="max-w-lg mx-auto px-4 pt-6 flex flex-col gap-4">
          <OfflineBanner />
          <SyncIndicator />
          <PullToRefresh>{children}</PullToRefresh>
        </div>
        <TabBar />
        <InstallPrompt />
      </div>
    </UndoToastProvider>
  );
}
