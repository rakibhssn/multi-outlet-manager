import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  LuPackageX,
  LuReceipt,
  LuTriangleAlert,
  LuUsers,
  LuWallet,
} from "react-icons/lu";
import {
  CurrencyValue,
  PageHeader,
  StatCard,
  ViewBox,
  trendOf,
} from "@/Screens/Layout/DashboardBlocks";
import useScope from "@/hooks/useScope";
import useNotify from "@/hooks/useNotify";
import useCan from "@/hooks/useCan";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { plural } from "@/lib/Functions/Common";
import LowStockItems from "./LowStockItems";
import SalesOrderDetails from "@/Screens/Sales/SalesOrderDetails";
import LiveOrders from "./LiveOrders";
import TodaySales from "./TodaySales";

const REFRESH_INTERVAL = 60000;

export default function Dashboard() {
  const navigate = useNavigate();
  const scope = useScope();
  const can = useCan();
  const notify = useNotify();
  const [stats, setStats] = useState(null);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = useCallback(() => {
    const params = { branchId: scope.outletId || undefined };
    notify.load(ApiService.get(API_LINK.OutletDashboard, { params }), {
      errorText: "Failed to load dashboard",
      onSuccess: (res) => setStats(res.data),
    });
  }, [scope.outletId, notify]);

  useEffect(() => {
    fetchStats();
    const timer = setInterval(fetchStats, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchStats]);

  const refresh = useCallback(() => {
    setRefreshKey((n) => n + 1);
    fetchStats();
  }, [fetchStats]);

  const loading = !stats;
  const sales = trendOf(stats?.sales.change, stats?.sales.today);
  const orders = trendOf(stats?.orders.change, stats?.orders.today);
  const critical = stats?.stock.critical ?? 0;

  return (
    <div className="dashboard">
      <PageHeader
        title="Dashboard"
        subtitle={`${scope.outletName ?? "Outlet"} overview for today`}
      />
      <div className="dashboard-stats">
        <StatCard
          label="Today's Sales"
          icon={LuWallet}
          loading={loading}
          value={<CurrencyValue amount={stats?.sales.today} />}
          meta={sales.meta}
          tone={sales.tone}
        />
        <StatCard
          label="Total Orders"
          icon={LuReceipt}
          loading={loading}
          value={(stats?.orders.today ?? 0).toLocaleString("en-US")}
          meta={orders.meta}
          tone={orders.tone}
        />
        <StatCard
          label="Staff on Shift"
          icon={LuUsers}
          loading={loading}
          value={stats?.staff.onShift ?? 0}
          meta={`of ${plural(stats?.staff.active ?? 0, "active staff member")}${
            stats?.staff.onBreak ? ` · ${stats.staff.onBreak} on break` : ""
          }`}
          tone={stats?.staff.onShift ? "up" : "muted"}
          onClick={
            can("shifts.view")
              ? () => navigate("/outlet/shift?status=ON_SHIFT")
              : undefined
          }
        />
        <StatCard
          label="Low Stock"
          icon={LuPackageX}
          loading={loading}
          value={plural(stats?.stock.low ?? 0, "Item")}
          meta={
            critical ? (
              <>
                <LuTriangleAlert /> {critical} Critical
              </>
            ) : (
              `At or below ${stats?.stock.lowLimit ?? 10} in stock`
            )
          }
          tone={critical ? "alert" : "muted"}
          onClick={() => setLowStockOpen(true)}
          disabled={!stats?.stock.low}
        />
      </div>
      {can("orders.view") && (
        <div className="dashboard-grid">
          <TodaySales refreshKey={refreshKey} onView={setDetailId} />
          <LiveOrders
            refreshKey={refreshKey}
            onView={setDetailId}
            onChange={refresh}
          />
        </div>
      )}
      <div className="dashboard-grid dashboard-grid-even">
        <ViewBox title="Popular Items" />
        <ViewBox title="Staff Schedule" />
      </div>

      <SalesOrderDetails
        open={!!detailId}
        orderId={detailId}
        onClose={() => setDetailId(null)}
        onChange={refresh}
      />

      <LowStockItems
        open={lowStockOpen}
        outletId={scope.outletId}
        lowLimit={stats?.stock.lowLimit}
        criticalLimit={stats?.stock.criticalLimit}
        onClose={() => setLowStockOpen(false)}
      />
    </div>
  );
}
