import {
  LuBookOpen,
  LuClock,
  LuReceipt,
  LuShoppingCart,
  LuChartNoAxesCombined,
  LuLayoutDashboard,
  LuShieldCheck,
  LuSoup,
  LuStore,
  LuUsers,
} from "react-icons/lu";
import { IoFastFoodSharp } from "react-icons/io5";
import { HiBuildingStorefront } from "react-icons/hi2";
import { BsPersonWorkspace } from "react-icons/bs";
import { canAccess } from "./Access";

export const HQ_MENUS = [
  {
    title: "Dashboard",
    link: "/hq/dashboard",
    icon: LuLayoutDashboard,
    permission: "dashboard.view",
  },
  {
    title: "Companies",
    link: "/hq/company",
    icon: HiBuildingStorefront,
    developerOnly: true,
    permission: "companies.view",
  },
  {
    title: "Outlets",
    link: "/hq/outlet",
    icon: LuStore,
    permission: "outlets.view",
  },
  {
    title: "Staffs",
    link: "/hq/staff",
    icon: BsPersonWorkspace,
    permission: "staff.view",
  },
  {
    title: "Menu",
    icon: LuBookOpen,
    children: [
      {
        title: "Menus",
        link: "/hq/menu",
        icon: IoFastFoodSharp,
        permission: "menus.view",
      },
      {
        title: "Menu Items",
        link: "/hq/menu-item",
        icon: LuSoup,
        permission: "items.view",
      },
    ],
  },
  {
    title: "Reports",
    link: "/hq/report",
    icon: LuChartNoAxesCombined,
    permission: "reports.view",
  },
  {
    title: "Roles",
    link: "/hq/roles",
    icon: LuShieldCheck,
    permission: "roles.view",
  },
];

export const OUTLET_MENUS = [
  {
    title: "Dashboard",
    link: "/outlet/dashboard",
    icon: LuLayoutDashboard,
    permission: "dashboard.view",
  },
  {
    title: "New Order",
    link: "/outlet/pos",
    icon: LuShoppingCart,
    permission: "orders.create",
  },
  {
    title: "Sales Orders",
    link: "/outlet/order",
    icon: LuReceipt,
    permission: "orders.view",
  },
  {
    title: "Menu",
    icon: LuBookOpen,
    children: [
      {
        title: "Menus",
        link: "/outlet/menu",
        icon: IoFastFoodSharp,
        permission: "menus.view",
      },
      {
        title: "Menu Items",
        link: "/outlet/menu-item",
        icon: LuSoup,
        permission: "items.view",
      },
    ],
  },
  {
    title: "Employees",
    link: "/outlet/employee",
    icon: LuUsers,
    permission: "staff.view",
  },
  {
    title: "Shifts",
    link: "/outlet/shift",
    icon: LuClock,
    permission: "shifts.view",
  },
  {
    title: "Reports",
    link: "/outlet/report",
    icon: LuChartNoAxesCombined,
    permission: "reports.view",
  },
];

export const HQ_ACCOUNTS = ["DEVELOPER", "HEADQUARTER"];

export const isHQAccount = (user) => HQ_ACCOUNTS.includes(user?.accountType);

export const isDeveloper = (user) => user?.accountType === "DEVELOPER";

const allowed = (menu, user, access) =>
  (!menu.developerOnly || isDeveloper(user)) &&
  canAccess(access, menu.permission);

export const menusFor = (user, access) =>
  (isHQAccount(user) ? HQ_MENUS : OUTLET_MENUS)
    .map((menu) =>
      menu.children
        ? {
            ...menu,
            children: menu.children.filter((child) =>
              allowed(child, user, access),
            ),
          }
        : menu,
    )
    .filter((menu) =>
      menu.children ? menu.children.length > 0 : allowed(menu, user, access),
    );

const dashboardFor = (user) =>
  isHQAccount(user) ? "/hq/dashboard" : "/outlet/dashboard";

export const homeFor = (user, access) => {
  if (!access) return dashboardFor(user);
  const first = flatMenus(menusFor(user, access)).find((menu) => menu.link);
  return first?.link ?? dashboardFor(user);
};

export const isRouteActive = (pathname, link) =>
  !!link && (pathname === link || pathname.startsWith(`${link}/`));

export const flatMenus = (menus) =>
  menus.flatMap((menu) => (menu.children ? [menu, ...menu.children] : [menu]));
