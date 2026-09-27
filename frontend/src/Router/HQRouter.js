import React from "react";
import { Navigate, Route } from "react-router";
import Dashboard from "@/Screens/HQ/Dashboard";
import CompanyList from "@/Screens/HQ/Company/CompanyList";
import CompanyDetails from "@/Screens/HQ/Company/CompanyDetails";
import OutletList from "@/Screens/HQ/Outlet/OutletList";
import OutletDetails from "@/Screens/HQ/Outlet/OutletDetails";
import StaffList from "@/Screens/HQ/Staff/StaffList";
import MenuList from "@/Screens/HQ/Menu/MenuList";
import MenuDetails from "@/Screens/HQ/Menu/MenuDetails";
import MenuItemList from "@/Screens/HQ/MenuItem/MenuItemList";
import Reports from "@/Screens/Report/Reports";
import Account from "@/Screens/Account/Account";
import RoleList from "@/Screens/HQ/Role/RoleList";
import DeveloperRoute from "./DeveloperRoute";
import { guarded } from "./PermissionRoute";

const HQRouter = (
  <Route path="hq">
    <Route index element={<Navigate to="dashboard" replace />} />
    {guarded(
      "dashboard.view",
      <Route path="dashboard" element={<Dashboard />} />,
    )}
    <Route element={<DeveloperRoute />}>
      <Route path="company" element={<CompanyList />} />
      <Route path="company/:id" element={<CompanyDetails />} />
    </Route>
    {guarded(
      "outlets.view",
      <Route path="outlet" element={<OutletList />} />,
      <Route path="outlet/:id" element={<OutletDetails />} />,
    )}
    {guarded("staff.view", <Route path="staff" element={<StaffList />} />)}
    {guarded(
      "menus.view",
      <Route path="menu" element={<MenuList />} />,
      <Route path="menu/:id" element={<MenuDetails />} />,
    )}
    {guarded(
      "items.view",
      <Route path="menu-item" element={<MenuItemList />} />,
    )}
    {guarded("reports.view", <Route path="report" element={<Reports />} />)}
    {guarded("roles.view", <Route path="roles" element={<RoleList />} />)}
    <Route path="account" element={<Account />} />
  </Route>
);

export default HQRouter;
