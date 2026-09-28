import React, { useState } from "react";
import { LuChartLine, LuReceipt, LuStore, LuUsers } from "react-icons/lu";
import {
  CurrencyValue,
  DashboardEmpty,
  DashboardRow,
  PageHeader,
  StatCard,
  trendOf,
} from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import SalesOrderDetails from "@/Screens/Sales/SalesOrderDetails";
import OutletPerformance from "./OutletPerformance";
import AlertDetail from "./AlertDetail";
import Alerts from "./Alerts";
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
  const [alert, setAlert] = useState(null);

  const show = {
    outlets: can("dashboard.hq.outlets"),
    revenue: can("dashboard.hq.revenue"),
    orders: can("dashboard.hq.orders"),
    employees: can("dashboard.hq.employees"),
    performance: can("dashboard.hq.performance"),
    reminders: can("reminders.view"),
    activity: can("dashboard.hq.activity"),
    alerts: can("dashboard.hq.alerts"),
  };
  const anyStat = show.outlets || show.revenue || show.orders || show.employees;
  const anyCard = Object.values(show).some(Boolean);

  usePolling(
    () => {
      if (!anyStat) return;
      notify.load(ApiService.get(API_LINK.CompanyDashboard), {
        errorText: "Failed to load dashboard",
        onSuccess: (res) => setStats(res.data),
      });
    },
    REFRESH_INTERVAL,
    anyStat,
  );

  const loading = !stats;
  const revenue = trendOf(stats?.sales?.change, stats?.sales?.today);
  const orders = trendOf(stats?.orders?.change, stats?.orders?.today);

  return (
    <div className="dashboard">
      <PageHeader title="Dashboard" subtitle="Headquarter overview" />
      {!anyCard && <DashboardEmpty />}
      {anyStat && (
        <div className="dashboard-stats">
          {show.outlets && (
            <StatCard
              label="Outlets"
              icon={LuStore}
              loading={loading}
              value={stats?.outlets?.active ?? 0}
              meta={`of ${stats?.outlets?.total ?? 0} active · ${stats?.outlets?.sellingToday ?? 0} selling today`}
            />
          )}
          {show.revenue && (
            <StatCard
              label="Revenue"
              icon={LuChartLine}
              loading={loading}
              value={<CurrencyValue amount={stats?.sales?.today} />}
              meta={revenue.meta}
              tone={revenue.tone}
              onClick={() => setDetail("revenue")}
            />
          )}
          {show.orders && (
            <StatCard
              label="Orders"
              icon={LuReceipt}
              loading={loading}
              value={(stats?.orders?.today ?? 0).toLocaleString("en-US")}
              meta={orders.meta}
              tone={orders.tone}
              onClick={() => setDetail("orders")}
            />
          )}
          {show.employees && (
            <StatCard
              label="Employees"
              icon={LuUsers}
              loading={loading}
              value={stats?.staff?.active ?? 0}
              meta={`${stats?.staff?.onShift ?? 0} on shift now`}
              tone={stats?.staff?.onShift ? "up" : "muted"}
            />
          )}
        </div>
      )}
      <DashboardRow>
        {show.performance && <OutletPerformance />}
        {show.reminders && <Reminders />}
      </DashboardRow>
      <DashboardRow className="dashboard-grid-even">
        {show.activity && <RecentActivity onOpenOrder={setOrderId} />}
        {show.alerts && <Alerts onOpen={setAlert} />}
      </DashboardRow>

      <RevenueByOutlet
        open={show.revenue && detail === "revenue"}
        onClose={() => setDetail(null)}
      />
      <TodayOrders
        open={show.orders && detail === "orders" && !orderId}
        onClose={() => setDetail(null)}
        onView={setOrderId}
      />
      <AlertDetail
        alert={alert}
        open={!!alert && !orderId}
        onClose={() => setAlert(null)}
        onOpenOrder={setOrderId}
      />
      <SalesOrderDetails
        open={!!orderId}
        orderId={orderId}
        onClose={() => setOrderId(null)}
      />
    </div>
  );
}
