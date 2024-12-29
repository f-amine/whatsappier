import { getCurrentUser } from "@/lib/sessions";
import { redirect } from "next/navigation";


interface AuthLayoutProps {
  children: React.ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return <div className="min-h-screen">{children}</div>;
}
