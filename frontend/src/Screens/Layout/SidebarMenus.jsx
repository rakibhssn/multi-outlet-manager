import React from "react";
import { Link, useLocation } from "react-router";
import { LuChevronRight } from "react-icons/lu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { isRouteActive } from "@/lib/Menus";

export default function SidebarMenus({ menus = [] }) {
  const { pathname } = useLocation();

  return (
    <SidebarMenu className="sidebar-menu">
      {menus.map((menu) =>
        menu.children ? (
          <SidebarGroupMenu key={menu.title} menu={menu} pathname={pathname} />
        ) : (
          <SidebarMenuItem key={menu.link}>
            <SidebarMenuButton
              render={<Link to={menu.link} />}
              tooltip={menu.title}
              isActive={isRouteActive(pathname, menu.link)}
              className="sidebar-menu-button"
            >
              {menu.icon && <menu.icon />}
              <span>{menu.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ),
      )}
    </SidebarMenu>
  );
}

function SidebarGroupMenu({ menu, pathname }) {
  const { state, setOpen } = useSidebar();
  const active = menu.children.some((child) => isRouteActive(pathname, child.link));

  return (
    <Collapsible key={active ? "active" : "idle"} defaultOpen={active} className="sidebar-group-menu">
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={menu.title}
              isActive={active && state === "collapsed"}
              className="sidebar-menu-button sidebar-group-trigger"
              onClick={() => state === "collapsed" && setOpen(true)}
            />
          }
        >
          {menu.icon && <menu.icon />}
          <span>{menu.title}</span>
          <LuChevronRight className="sidebar-group-chevron" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="sidebar-submenu">
            {menu.children.map((child) => (
              <SidebarMenuSubItem key={child.link}>
                <SidebarMenuSubButton
                  render={<Link to={child.link} />}
                  isActive={isRouteActive(pathname, child.link)}
                  className="sidebar-submenu-button"
                >
                  {child.icon && <child.icon />}
                  <span>{child.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
