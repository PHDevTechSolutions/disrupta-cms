"use client"

import * as React from "react"
import { BookOpen, SquareTerminal, Inbox } from "lucide-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Product",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "All Product", url: "#" },
        { title: "Add new product", url: "#" },
        { title: "Orders", url: "#" },
      ],
    },
    {
      title: "Pages",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "All Blogs", url: "#" },
        { title: "Careers", url: "#" },
      ],
    },
    {
      title: "Inquiries",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Customer Inquiries", url: "#" },
        { title: "Quotation", url: "#" },
        { title: "Job Application", url: "#" },
      ],
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  onNavigate: (view: string) => void
}

export function AppSidebar({ onNavigate, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Optional: logo / brand */}
      <SidebarHeader className="px-3 py-2">
        <span className="text-sm font-semibold tracking-tight">
          Disrupta CMS
        </span>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} onNavigate={onNavigate} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
