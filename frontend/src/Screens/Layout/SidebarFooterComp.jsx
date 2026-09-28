import React from "react";
import { LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export default function SidebarFooterComp() {
  const { open, isMobile, toggleSidebar } = useSidebar();
  const expanded = open || isMobile;
  const Icon = expanded ? LuPanelLeftClose : LuPanelLeftOpen;

  return (
    <SidebarFooter
      className={cn("sidebar-footer", expanded && "sidebar-footer-open")}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        className="sidebar-toggle"
      >
        <Icon />
      </button>
    </SidebarFooter>
  );
}
