import React, { useEffect, useMemo, useState } from "react";
import { CustomDialog, CustomTable, StatusComp } from "@/components/custom";
import { trendOf } from "@/Screens/Layout/DashboardBlocks";
import { StackCell } from "@/Screens/Layout/TableCells";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, plural } from "@/lib/Functions/Common";
import { OutletSalesColumn } from "@/lib/TableData/Columns";
import { cn } from "@/lib/utils";

export default function RevenueByOutlet({ open, onClose }) {
  const notify = useNotify();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    notify.load(ApiService.get(API_LINK.CompanyOutletSales), {
      errorText: "Failed to load revenue by outlet",
      onSuccess: (res) => setRows(res.data ?? []),
    });
  }, [open, notify]);

  const totals = useMemo(
    () =>
      (rows ?? []).reduce(
        (sum, row) => ({
          orders: sum.orders + row.orders,
          items: sum.items + row.items,
          revenue: sum.revenue + row.revenue,
        }),
        { orders: 0, items: 0, revenue: 0 },
      ),
    [rows],
  );

  const dataSource = useMemo(
    () =>
      (rows ?? []).map((row) => {
        const trend = trendOf(row.change, row.revenue);
        return {
          key: row.id,
          outlet: <StackCell title={row.name} subtitle={row.company} />,
          orders: <span className="stock-count">{row.orders}</span>,
          items: <span className="stock-count">{row.items}</span>,
          revenue: (
            <span className="stock-count">{formatMoney(row.revenue)}</span>
          ),
          average: formatMoney(row.average),
          share: `${row.share}%`,
          change: (
            <span
              className={cn("stat-card-meta", `stat-card-meta-${trend.tone}`)}
            >
              {trend.meta}
            </span>
          ),
          status: <StatusComp type={row.status} />,
        };
      }),
    [rows],
  );

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title="Today's Revenue by Outlet"
      description={`${formatMoney(totals.revenue)} from ${plural(totals.orders, "order")} and ${plural(
        totals.items,
        "item",
      )} today, compared with yesterday.`}
      footer={false}
      className="item-outlets-dialog"
    >
      <CustomTable
        columns={OutletSalesColumn}
        dataSource={dataSource}
        rowKey="key"
        loading={rows === null}
        pagination={false}
        showSearch={false}
        showReload={false}
        emptyText="No outlets yet"
        className="table-card-plain"
      />
    </CustomDialog>
  );
}
