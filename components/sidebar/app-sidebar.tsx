"use client"

import type * as React from "react"
import { BookOpen, Command, FileText, Settings2, Package } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "Admin User",
    email: "admin@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Inquiries",
      icon: FileText,
      isActive: true,
      items: [
        {
          title: "Customer Inquiries",
          url: "/inquiries/customer-inquiries",
        },
        {
          title: "Job Applications",
          url: "/inquiries/job-application",
        },
        {
          title: "Quotations",
          url: "/inquiries/quotation",
        },
      ],
    },
    {
      title: "Products",
      icon: Package,
      items: [
        {
          title: "Website Products",
          url: "/products/all-products",
        },
        {
          title: "Taskflow Products",
          url: "/products/taskflow-products",
        },
        {
          title: "Orders",
          url: "/products/orders",
        },
        {
          title: "Applications Maintenance",
          url: "/products/applications",
        },
        {
          title: "Specifications Maintenance",
          url: "/products/specs-maintenance",
        },
        {
          title: "Category Maintenance",
          url: "/products/category",
        },
      ],
    },
    {
      title: "Managers",
      icon: Settings2,
      items: [
        {
          title: "Blog Manager",
          url: "/managers/blog-manager",
        },
        {
          title: "Brands Manager",
          url: "/managers/brands-manager",
        },
        {
          title: "Careers Manager",
          url: "/managers/careers-manager",
        },
        {
          title: "Company Manager",
          url: "/managers/company-manager",
        },
      ],
    },
    {
      title: "Solutions",
      icon: Settings2,
      items: [
        {
          title: "Solutions Collection",
          url: "/solutions/solutions-collection",
        },
        {
          title: "Series",
          url: "/solutions/series",
        },
      ],
    },
  ] as const,
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: BookOpen,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">DisruptAcms</span>
                  <span className="truncate text-xs">Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain as any} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}