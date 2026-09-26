import React from "react";
import { LuChartColumn, LuPackage, LuSoup, LuUsers } from "react-icons/lu";
import { PageHeader, StatSlot, ViewBox } from "@/Screens/Layout/DashboardBlocks";

const REPORTS = [
  { label: "Sales", icon: LuChartColumn },
  { label: "Stock", icon: LuPackage },
  { label: "Staff", icon: LuUsers },
  { label: "Menu Performance", icon: LuSoup },
];

export default function Reports() {
  return (
    <div className="dashboard">
      <PageHeader title="Reports" subtitle="Sales, stock, staff and menu insights across outlets" />
      <div className="dashboard-stats">
        {REPORTS.map((report) => (
          <StatSlot key={report.label} label={report.label} icon={report.icon} />
        ))}
      </div>
      <div className="dashboard-grid">
        <ViewBox title="Sales Report" className="dashboard-span-2" />
        <ViewBox title="Top Selling Items" />
      </div>
      <div className="dashboard-grid dashboard-grid-even">
        <ViewBox title="Stock Report" />
        <ViewBox title="Staff Report" />
      </div>
    </div>
  );
}
