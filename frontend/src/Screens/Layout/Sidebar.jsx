import React from "react";
import { useAtomValue } from "jotai";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { userData } from "@/lib/Variables";
import { isHQAccount, menusFor } from "@/lib/Menus";
import SidebarMenus from "./SidebarMenus";
import SidebarFooterComp from "./SidebarFooterComp";

export default function Sidebar() {
  const { user, access } = useAtomValue(userData);

  return (
    <SidebarRoot
      variant="floating"
      collapsible="icon"
      className="layout-sidebar"
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isHQAccount(user) ? "Headquarter" : "Outlet"}
          </SidebarGroupLabel>
          <SidebarMenus menus={menusFor(user, access)} />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooterComp />
    </SidebarRoot>
  );
}
