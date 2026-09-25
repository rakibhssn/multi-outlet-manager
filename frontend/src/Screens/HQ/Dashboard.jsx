import React from "react";
import { LuChartLine, LuReceipt, LuStore, LuUsers } from "react-icons/lu";
import { PageHeader, StatSlot, ViewBox } from "@/Screens/Layout/DashboardBlocks";

const STATS = [
  { label: "Outlets", icon: LuStore },
  { label: "Revenue", icon: LuChartLine },
  { label: "Orders", icon: LuReceipt },
  { label: "Employees", icon: LuUsers },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <PageHeader title="Dashboard" subtitle="Headquarter overview" />
      <div className="dashboard-stats">
        {STATS.map((stat) => (
          <StatSlot key={stat.label} label={stat.label} icon={stat.icon} />
        ))}
      </div>
      <div className="dashboard-grid">
        <ViewBox title="Outlet Performance" className="dashboard-span-2" />
        <ViewBox title="Recent Activity" />
      </div>
      <div className="dashboard-grid dashboard-grid-even">
        <ViewBox title="Top Outlets" />
        <ViewBox title="Alerts" />
      </div>
    </div>
  );
}
