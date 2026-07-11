import { AppShell } from "@/components/nav/AppShell";
import { signOut } from "./actions";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell onSignOut={signOut}>{children}</AppShell>;
}
