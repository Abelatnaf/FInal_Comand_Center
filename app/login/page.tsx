import { LoginForm } from "@/components/LoginForm";
import { AuthTabs } from "@/components/AuthTabs";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="glass w-full max-w-sm p-7">
        <div className="mb-6">
          <h1 className="ios-title2">Command Deck</h1>
          <p className="ios-subhead text-text-dim mt-0.5">Finance Command Center</p>
        </div>
        <AuthTabs active="login" />
        <LoginForm />
      </div>
    </div>
  );
}
