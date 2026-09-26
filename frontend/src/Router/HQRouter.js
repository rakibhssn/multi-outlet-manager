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
import Reports from "@/Screens/HQ/Report/Reports";
import Settings from "@/Screens/HQ/Settings/Settings";
import DeveloperRoute from "./DeveloperRoute";

const HQRouter = (
  <Route path="hq">
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route element={<DeveloperRoute />}>
      <Route path="company" element={<CompanyList />} />
      <Route path="company/:id" element={<CompanyDetails />} />
    </Route>
    <Route path="outlet" element={<OutletList />} />
    <Route path="outlet/:id" element={<OutletDetails />} />
    <Route path="staff" element={<StaffList />} />
    <Route path="menu" element={<MenuList />} />
    <Route path="menu/:id" element={<MenuDetails />} />
    <Route path="menu-item" element={<MenuItemList />} />
    <Route path="report" element={<Reports />} />
    <Route path="settings" element={<Settings />} />
  </Route>
);

export default HQRouter;
