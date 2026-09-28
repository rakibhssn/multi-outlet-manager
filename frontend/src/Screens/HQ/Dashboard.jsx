import React, { useState } from "react";
import { LuChartLine, LuReceipt, LuStore, LuUsers } from "react-icons/lu";
import {
  CurrencyValue,
  PageHeader,
  StatCard,
  ViewBox,
  trendOf,
} from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import SalesOrderDetails from "@/Screens/Sales/SalesOrderDetails";
import OutletPerformance from "./OutletPerformance";
import RecentActivity from "./RecentActivity";
import Reminders from "./Reminder/Reminders";
import RevenueByOutlet from "./RevenueByOutlet";
import TodayOrders from "./TodayOrders";

const REFRESH_INTERVAL = 60000;

export default function Dashboard() {
  const notify = useNotify();
  const can = useCan();
  const [stats, setStats] = useState(null);
  const [detail, setDetail] = useState(null);
  const [orderId, setOrderId] = useState(null);

  usePolling(() => {
    notify.load(ApiService.get(API_LINK.CompanyDashboard), {
      errorText: "Failed to load dashboard",
      onSuccess: (res) => setStats(res.data),
    });
  }, REFRESH_INTERVAL);

  const loading = !stats;
  const revenue = trendOf(stats?.sales.change, stats?.sales.today);
  const orders = trendOf(stats?.orders.change, stats?.orders.today);

  return (
    <div className="dashboard">
      <PageHeader title="Dashboard" subtitle="Headquarter overview" />
      <div className="dashboard-stats">
        <StatCard
          label="Outlets"
          icon={LuStore}
          loading={loading}
          value={stats?.outlets.active ?? 0}
          meta={`of ${stats?.outlets.total ?? 0} active · ${stats?.outlets.sellingToday ?? 0} selling today`}
        />
        <StatCard
          label="Revenue"
          icon={LuChartLine}
          loading={loading}
          value={<CurrencyValue amount={stats?.sales.today} />}
          meta={revenue.meta}
          tone={revenue.tone}
          onClick={() => setDetail("revenue")}
        />
        <StatCard
          label="Orders"
          icon={LuReceipt}
          loading={loading}
          value={(stats?.orders.today ?? 0).toLocaleString("en-US")}
          meta={orders.meta}
          tone={orders.tone}
          onClick={() => setDetail("orders")}
        />
        <StatCard
          label="Employees"
          icon={LuUsers}
          loading={loading}
          value={stats?.staff.active ?? 0}
          meta={`${stats?.staff.onShift ?? 0} on shift now`}
          tone={stats?.staff.onShift ? "up" : "muted"}
        />
      </div>
      <div className="dashboard-grid">
        <OutletPerformance />
        {can("reminders.view") && <Reminders />}
      </div>
      <div className="dashboard-grid dashboard-grid-even">
        <RecentActivity onOpenOrder={setOrderId} />
        <ViewBox title="Alerts" />
      </div>

      <RevenueByOutlet
        open={detail === "revenue"}
        onClose={() => setDetail(null)}
      />
      <TodayOrders
        open={detail === "orders" && !orderId}
        onClose={() => setDetail(null)}
        onView={setOrderId}
      />
      <SalesOrderDetails
        open={!!orderId}
        orderId={orderId}
        onClose={() => setOrderId(null)}
      />
    </div>
  );
}
