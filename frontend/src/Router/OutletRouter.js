import React from "react";
import { Navigate, Route } from "react-router";
import Dashboard from "@/Screens/Outlet/Dashboard";
import StaffList from "@/Screens/HQ/Staff/StaffList";
import NewOrder from "@/Screens/Sales/NewOrder";
import SalesOrderList from "@/Screens/Sales/SalesOrderList";
import OutletMenus from "@/Screens/Outlet/Menu/OutletMenus";
import OutletMenuItems from "@/Screens/Outlet/Menu/OutletMenuItems";
import ShiftList from "@/Screens/Outlet/Shift/ShiftList";
import Reports from "@/Screens/Report/Reports";
import Account from "@/Screens/Account/Account";
import { guarded } from "./PermissionRoute";

const OutletRouter = (
  <Route path="outlet">
    <Route index element={<Navigate to="dashboard" replace />} />
    {guarded(
      "dashboard.view",
      <Route path="dashboard" element={<Dashboard />} />,
    )}
    {guarded("orders.create", <Route path="pos" element={<NewOrder />} />)}
    {guarded(
      "orders.view",
      <Route path="order" element={<SalesOrderList />} />,
    )}
    {guarded("menus.view", <Route path="menu" element={<OutletMenus />} />)}
    {guarded(
      "items.view",
      <Route path="menu-item" element={<OutletMenuItems />} />,
    )}
    {guarded("staff.view", <Route path="employee" element={<StaffList />} />)}
    {guarded("shifts.view", <Route path="shift" element={<ShiftList />} />)}
    {guarded("reports.view", <Route path="report" element={<Reports />} />)}
    <Route path="account" element={<Account />} />
  </Route>
);

export default OutletRouter;
