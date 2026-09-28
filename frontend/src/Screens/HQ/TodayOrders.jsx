import React, { useMemo } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { ActionComp, CustomDialog, CustomTable } from "@/components/custom";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import { API_LINK } from "@/lib/API_LINK";
import { ORDER_STATUS_OPTIONS } from "@/lib/Constant";
import { SalesOrderColumn } from "@/lib/TableData/Columns";
import { orderCells } from "@/Screens/Sales/OrderParts";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "confirmedAt",
  order_by: "desc",
};

export default function TodayOrders({ open, onClose, onView }) {
  const scope = useScope();
  const now = new Date();
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.SalesOrder,
    defaults: DEFAULT_PARAMS,
    initialParams: {
      companyId: scope.companyId || undefined,
      from: startOfDay(now).toISOString(),
      to: endOfDay(now).toISOString(),
    },
    filterParam: "status",
    enabled: open,
    errorText: "Failed to load today's orders",
  });

  const orders = useMemo(
    () =>
      rows.map((item, index) => ({
        key: item.id,
        id: 1 + index + offset,
        ...orderCells(item),
        action: (
          <ActionComp
            className="justify-end"
            view={true}
            viewTitle="View order"
            viewAction={() => onView(item.id)}
          />
        ),
      })),
    [rows, offset, onView],
  );

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title="Today's Orders"
      description={`${table.total} order${table.total === 1 ? "" : "s"} across every outlet today.`}
      footer={false}
      className="item-outlets-dialog hq-orders-dialog"
    >
      <CustomTable
        columns={SalesOrderColumn}
        dataSource={orders}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={ORDER_STATUS_OPTIONS}
        filterPlaceholder="All statuses"
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search order no, customer or table..."
        emptyText="No orders yet today"
        className="table-card-plain"
      />
    </CustomDialog>
  );
}
