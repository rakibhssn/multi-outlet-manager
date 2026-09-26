import React from "react";
import { PageHeader, ViewBox } from "@/Screens/Layout/DashboardBlocks";

export default function Settings() {
  return (
    <div className="dashboard">
      <PageHeader title="Settings" subtitle="Manage your profile, company and preferences" />
      <div className="dashboard-grid dashboard-grid-even">
        <ViewBox title="Profile" />
        <ViewBox title="Company" />
      </div>
      <div className="dashboard-grid dashboard-grid-even">
        <ViewBox title="Notifications" />
        <ViewBox title="Security" />
      </div>
    </div>
  );
}
