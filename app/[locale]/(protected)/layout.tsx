import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies, headers } from "next/headers";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/ui/sidebar/dashboard-sidebar";
import React from "react";
import { BreadcrumbNavigation } from "@/components/layout/dynamicBreadcrumbs";



export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"
  return (

    <SidebarProvider defaultOpen={defaultOpen} >
      <AppSidebar />
      <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <BreadcrumbNavigation />
        </div>
      </header>
      <div className="container mx-auto flex py-10">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
