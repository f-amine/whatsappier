"use client"

import * as React from "react"
import {
    Activity,
  AlertCircle,
  Bot,
  Cable,
  Command,
  FileText,
  Gauge,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  Network,
  Newspaper,
  Phone,
  PieChart,
  Send,
  Settings,
  Settings2,
  ShoppingCart,
  Smartphone,
} from "lucide-react"
import { NavMain } from "./nav-main"
import { NavResources } from "./nav-ressources"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../sidebar"
import { useSession } from "next-auth/react"
import { Link } from "@/i18n/routing"
import { title } from "process"




const data = {
  navMain: [
    {
      title: "Automations",
      url: "/automations",
      icon : Bot,
      isActive: true,
      items: []
    },
    {
      title: "Devices",
      url: "/devices",
      icon: Smartphone,
      isActive: true,
      items: []
    },
    {
      title: "Connections",
      url: "/connections",
      icon: Network,
      items: []
    },
    {
      title: "Broadcasts",
      url: "/bulk",
      icon: Megaphone,
      items: []
    },
    {
      title: "Templates",
      url: "/templates",
      icon: MessageSquare,
      items: []
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: []
    }
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  resources: [
    {
      name: "Analytics",
      url: "/analytics",
      icon: PieChart,
    },
    {
      name: "Orders",
      url: "/orders",
      icon: ShoppingCart,
    },
    {
      name: "Usage",
      url: "/usage",
      icon: Gauge,
    },
    {
      name: "Docs",
      url: "/docs",
      icon: FileText,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession()
 
 if (session?.user){
  const user = {
    name: session.user.name ?? 'Unknown',
    email: session.user.email ?? 'No email',
    image: session.user.image ?? '/default-avatar.png'
  };
  return (
    <Sidebar variant="floating" collapsible="icon"
      {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Whatsappier</span>
                  <span className="truncate text-xs">Salzier</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavResources resources={data.resources} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
  }
}
