import React from "react";
import { LuClock, LuReceipt, LuUsers, LuWallet } from "react-icons/lu";
import {
  PageHeader,
  StatSlot,
  ViewBox,
} from "@/Screens/Layout/DashboardBlocks";

const STATS = [
  { label: "Today's Sales", icon: LuWallet },
  { label: "Orders", icon: LuReceipt },
  { label: "Staff on Shift", icon: LuUsers },
  { label: "Avg. Prep Time", icon: LuClock },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <PageHeader title="Dashboard" subtitle="Outlet overview" />
      <div className="dashboard-stats">
        {STATS.map((stat) => (
          <StatSlot key={stat.label} label={stat.label} icon={stat.icon} />
        ))}
      </div>
      <div className="dashboard-grid">
        <ViewBox title="Sales Today" className="dashboard-span-2" />
        <ViewBox title="Live Orders" />
      </div>
      <div className="dashboard-grid dashboard-grid-even">
        <ViewBox title="Popular Items" />
        <ViewBox title="Staff Schedule" />
      </div>
    </div>
  );
}
