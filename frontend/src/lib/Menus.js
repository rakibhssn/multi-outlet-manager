import {
  LuBookOpen,
  LuLayoutDashboard,
  LuList,
  LuSoup,
  LuStore,
  LuUsers,
} from "react-icons/lu";
import { HiBuildingStorefront } from "react-icons/hi2";
import { BsPersonWorkspace } from "react-icons/bs";

export const HQ_MENUS = [
  { title: "Dashboard", link: "/hq/dashboard", icon: LuLayoutDashboard },
  {
    title: "Companies",
    link: "/hq/company",
    icon: HiBuildingStorefront,
    developerOnly: true,
  },
  { title: "Outlets", link: "/hq/outlet", icon: LuStore },
  { title: "Staffs", link: "/hq/staff", icon: BsPersonWorkspace },
  {
    title: "Menu",
    icon: LuBookOpen,
    children: [
      { title: "Menus", link: "/hq/menu", icon: LuList },
      { title: "Menu Items", link: "/hq/menu-item", icon: LuSoup },
    ],
  },
];

export const OUTLET_MENUS = [
  { title: "Dashboard", link: "/outlet/dashboard", icon: LuLayoutDashboard },
  { title: "Employees", link: "/outlet/employee", icon: LuUsers },
];

export const HQ_ACCOUNTS = ["DEVELOPER", "HEADQUARTER"];

export const isHQAccount = (user) => HQ_ACCOUNTS.includes(user?.accountType);

export const isDeveloper = (user) => user?.accountType === "DEVELOPER";

export const menusFor = (user) =>
  (isHQAccount(user) ? HQ_MENUS : OUTLET_MENUS).filter(
    (menu) => !menu.developerOnly || isDeveloper(user),
  );

export const homeFor = (user) =>
  isHQAccount(user) ? "/hq/dashboard" : "/outlet/dashboard";

export const isRouteActive = (pathname, link) =>
  !!link && (pathname === link || pathname.startsWith(`${link}/`));

export const flatMenus = (menus) =>
  menus.flatMap((menu) => (menu.children ? [menu, ...menu.children] : [menu]));
