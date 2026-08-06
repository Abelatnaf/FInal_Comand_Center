import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/nav/TabBar";
import { Sidebar } from "@/components/nav/Sidebar";
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
      {/* Below 1024px: the single column and bottom tab bar the "three taps
          to log" promise was designed around, unchanged. From 1024px: the
          sidebar takes over and the content is offset past it, because a
          512px column stranded in the middle of a laptop screen was never a
          layout decision -- it was the absence of one. */}
      <div className="min-h-screen pb-20 lg:pb-0 lg:pl-[244px]">
        <Sidebar />
        <div className="max-w-lg lg:max-w-5xl mx-auto px-4 lg:px-8 pt-6 lg:pt-10 flex flex-col gap-4">
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
