import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="card w-full max-w-sm p-7">
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-text">Command Deck</h1>
          <p className="text-[15px] text-muted mt-0.5">Every expense, in one place.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
