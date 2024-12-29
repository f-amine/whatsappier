"use client"
import { type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "../sidebar"

export function NavResources({
  resources,
}: {
  resources: {
    name: string
    url: string
    icon: LucideIcon,
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Resources</SidebarGroupLabel>
      <SidebarMenu>
        {resources.map((item) => {
          const isActive = pathname === item.url
          return (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton 
                asChild
                tooltip={item.name}
                data-active={isActive}
                className="data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
              >
                <a href={item.url}>
                  <item.icon className="size-4" />
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
