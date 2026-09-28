import React, { useMemo, useState } from "react";
import { ActionComp, CustomDialog, CustomTable } from "@/components/custom";
import { StackCell, StockCell } from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useTableList from "@/hooks/useTableList";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { StockOutColumn } from "@/lib/TableData/Columns";
import OutletPriceDialog, {
  outletAssignment,
} from "@/Screens/HQ/MenuItem/OutletPriceDialog";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "name",
  order_by: "asc",
};

export default function OutletStockOut({ open, outlet, onClose, onChange }) {
  const can = useCan();
  const canStock = can("outlets.stock");
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.MenuItem,
    defaults: DEFAULT_PARAMS,
    initialParams: { outletId: outlet?.id, stockStatus: "out" },
    enabled: open && !!outlet?.id,
    errorText: "Failed to load stocked out items",
  });
  const [stockRow, setStockRow] = useState(null);

  const items = useMemo(
    () =>
      rows.map((row, index) => ({
        key: row.id,
        id: 1 + index + offset,
        name: <StackCell title={row.name} subtitle={row.menu?.name} />,
        price: formatMoney(row.effectivePrice),
        stock: <StockCell stock={0} />,
        action: (
          <ActionComp
            className="justify-end"
            edit={canStock}
            editTitle="Update stock"
            editAction={() => setStockRow(outletAssignment(row, outlet))}
          />
        ),
      })),
    [rows, offset, outlet, canStock],
  );

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title="Stocked Out Items"
      description={`Items with no stock left at "${outlet?.name ?? ""}".`}
      footer={false}
      className="item-outlets-dialog"
    >
      <CustomTable
        columns={
          canStock
            ? StockOutColumn
            : StockOutColumn.filter((column) => column.key !== "action")
        }
        dataSource={items}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="Nothing is stocked out here"
        className="table-card-plain"
      />

      <OutletPriceDialog
        open={!!stockRow}
        assignment={stockRow}
        onClose={() => setStockRow(null)}
        onSaved={() => {
          setStockRow(null);
          reload();
          onChange?.();
        }}
      />
    </CustomDialog>
  );
}
