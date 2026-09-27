import React, { Fragment } from "react";
import { Link, useLocation } from "react-router";
import { useAtomValue } from "jotai";
import { LuHouse } from "react-icons/lu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { breadcrumbLabels, userData } from "@/lib/Variables";
import { flatMenus, homeFor, menusFor } from "@/lib/Menus";

const humanize = (value) =>
  decodeURIComponent(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function Breadcrumbs() {
  const { pathname } = useLocation();
  const { user, access } = useAtomValue(userData);
  const labels = useAtomValue(breadcrumbLabels);
  const menus = flatMenus(menusFor(user, access));

  const segments = pathname.split("/").filter(Boolean);
  const trail = segments.slice(1).map((segment, index) => {
    const href = `/${segments.slice(0, index + 2).join("/")}`;
    const menu = menus.find((m) => m.link === href);
    return {
      href,
      label: labels[href] ?? menu?.title ?? humanize(segment),
      isCurrent: index === segments.length - 2,
    };
  });

  return (
    <Breadcrumb className="layout-breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            render={<Link to={homeFor(user, access)} aria-label="Home" />}
          >
            <LuHouse className="size-4" />
          </BreadcrumbLink>
        </BreadcrumbItem>
        {trail.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {crumb.isCurrent ? (
                <BreadcrumbPage className="font-medium">
                  {crumb.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link to={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
