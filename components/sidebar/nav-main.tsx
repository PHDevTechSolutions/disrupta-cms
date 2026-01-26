"use client"

import { IconCirclePlusFilled, IconMail } from "@tabler/icons-react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

/* ---------------- TYPES ---------------- */

type NavSubItem = {
  title: string
  url: string
}

type NavItem = {
  title: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavSubItem[]
}

/* ---------------- COMPONENT ---------------- */

export function NavMain({
  items,
  onNavigate,
}: {
  items: NavItem[]
  onNavigate: (url: string) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>

      <SidebarGroupContent className="flex flex-col gap-3">
        {/* 🔹 Quick Actions */}
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              className="bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/90 min-w-8"
              onClick={() => onNavigate("/dashboard")}
            >
              <IconCirclePlusFilled />
              <span>Dashboard</span>
            </SidebarMenuButton>

            <Button
              size="icon"
              variant="outline"
              className="size-8 bg-transparent"
              onClick={() => onNavigate("/inbox")}
            >
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* 🔹 Main Navigation */}
        <SidebarMenu>
          {items.map((item) => (
            <Collapsible
              key={item.title}
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                {/* ✅ ENTIRE ROW IS THE TRIGGER */}
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>

                    {/* Chevron is VISUAL ONLY, no separate interaction */}
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => onNavigate(subItem.url)}
                          >
                            {subItem.title}
                          </button>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
