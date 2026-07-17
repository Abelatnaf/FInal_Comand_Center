import { LoginForm } from "@/components/LoginForm";
import { AuthTabs } from "@/components/AuthTabs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="glass w-full max-w-sm p-7">
        <div className="mb-6">
          <h1 className="ios-title2">Command Deck</h1>
          <p className="ios-subhead text-text-dim mt-0.5">Finance Command Center</p>
        </div>
        {deleted && (
          <div className="mb-5 rounded-[10px] px-3.5 py-3 bg-[var(--fill-tertiary)]">
            <p className="ios-footnote text-text">Your account and all its data have been permanently deleted.</p>
          </div>
        )}
        <AuthTabs active="login" />
        <LoginForm />
      </div>
    </div>
  );
}
