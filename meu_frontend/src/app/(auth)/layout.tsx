import { Toaster } from "sonner";
import { AuthShell } from "@/features/auth/components/auth-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthShell>{children}</AuthShell>
      <Toaster />
    </>
  );
}
