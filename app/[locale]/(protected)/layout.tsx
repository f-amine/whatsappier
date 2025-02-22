import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/ui/sidebar/dashboard-sidebar";
import React from "react";
import { BreadcrumbNavigation } from "@/components/layout/dynamicBreadcrumbs";
import DevSeedButton from "@/components/dev/DevSeedButtons";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"
  const isDev = process.env.NODE_ENV === 'development'
  
  return (
    <SidebarProvider defaultOpen={defaultOpen} >
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <BreadcrumbNavigation />
          </div>
          {isDev && (
            <div className="flex items-center gap-2">
              <DevSeedButton />
            </div>
          )}
        </header>
        <div className="container mx-auto flex py-10">{children}</div>
      </SidebarInset>
      <div className="fixed inset-0 n bg-cover bg-center opacity-0 dark:opacity-30 pointer-events-none" style={{ backgroundImage: "url('/bg-gradient2.png')" }}/>
    </SidebarProvider>
  );
}
