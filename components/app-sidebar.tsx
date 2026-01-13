"use client"

import { LogOut } from "lucide-react"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      label: "Inquiries",
      submenu: [
        { label: "Customer Inquiries", href: "/inquiries/customer-inquiries" },
        { label: "Job Applications", href: "/inquiries/job-application" },
        { label: "Quotation Inquiries", href: "/inquiries/quote-inquiries" },
        { label: "Quotation", href: "/inquiries/quotation" },
      ],
    },
    {
      label: "Products",
      submenu: [
        { label: "All Products", href: "/products/all-products" },
        { label: "Add Product", href: "/products/add-product" },
      ],
    },
    {
      label: "Managers",
      submenu: [
        { label: "Blog Manager", href: "/managers/blog-manager" },
        { label: "Careers Manager", href: "/managers/careers-manager" },
      ],
    },
  ]

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((group) => (
                <SidebarMenuItem key={group.label}>
                  <div className="px-2 py-1.5 text-sm font-semibold text-sidebar-foreground">{group.label}</div>
                  <SidebarMenuSub>
                    {group.submenu.map((item) => (
                      <SidebarMenuSubItem key={item.href}>
                        <SidebarMenuSubButton href={item.href} isActive={pathname === item.href}>
                          {item.label}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
