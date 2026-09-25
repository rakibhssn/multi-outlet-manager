import React from "react";
import { Navigate, Route } from "react-router";
import Dashboard from "@/Screens/Outlet/Dashboard";
import StaffList from "@/Screens/HQ/Staff/StaffList";

const OutletRouter = (
  <Route path="outlet">
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="employee" element={<StaffList />} />
  </Route>
);

export default OutletRouter;
