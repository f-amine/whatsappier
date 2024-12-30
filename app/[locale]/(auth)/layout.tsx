import { redirect } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/sessions";


interface AuthLayoutProps {
  children: React.ReactNode;
  params: {locale:string}
}

export default async function AuthLayout({ children,params }: AuthLayoutProps) {
  const {locale}= await params;
  const user = await getCurrentUser();

  if (user) {
    redirect({href:"/dashboard",locale:locale});
  }

  return <div className="min-h-screen">{children}</div>;
}
