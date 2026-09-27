import React, { useCallback, useMemo, useState } from "react";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import {
  OutletPriceCell,
  StackCell,
  StockCell,
} from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, nameOption } from "@/lib/Functions/Common";
import { OutletItemColumn } from "@/lib/TableData/Columns";
import OutletPriceDialog, {
  outletAssignment,
} from "@/Screens/HQ/MenuItem/OutletPriceDialog";
import OutletAssignItem from "./OutletAssignItem";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const COLUMNS = OutletItemColumn.filter(
  (column) => !["id", "status"].includes(column.key),
);
const READ_COLUMNS = COLUMNS.filter((column) => column.key !== "action");

export default function OutletItemList({ outlet, onChange }) {
  const notify = useNotify();
  const confirm = useConfirm();
  const can = useCan();
  const canStock = can("outlets.stock");
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.MenuItem,
    defaults: DEFAULT_PARAMS,
    initialParams: { outletId: outlet?.id },
    filterParam: "menuId",
    enabled: !!outlet?.id,
    errorText: "Failed to load items",
  });
  const [openAssign, setOpenAssign] = useState(false);
  const [priceRow, setPriceRow] = useState(null);

  const menuFilter = useRemoteOptions({
    url: API_LINK.Menu,
    mapOption: nameOption,
    errorText: "Failed to load menus",
  });

  const refresh = useCallback(() => {
    reload();
    onChange?.();
  }, [reload, onChange]);

  const items = useMemo(() => {
    const removeItem = (row) =>
      confirm.remove({
        title: "Remove Item",
        body: `"${outlet?.name}" will stop selling "${row.name}". Continue?`,
        label: "Remove",
        onConfirm: () =>
          notify.submit(
            ApiService.delete(API_LINK.MenuItemOutlet(row.id, outlet.id)),
            {
              errorText: "Failed to remove item",
              onSuccess: () => {
                refresh();
                confirm.close();
              },
            },
          ),
      });

    return rows.map((row, index) => ({
      key: row.id,
      id: 1 + index + offset,
      name: <StackCell title={row.name} subtitle={row.menu?.name} />,
      defaultPrice: (
        <span className="price-inherit">{formatMoney(row.defaultPrice)}</span>
      ),
      outletPrice: <OutletPriceCell price={row.outletPrice} />,
      stock: <StockCell stock={row.stock} />,
      status: <StatusComp type={row.status} />,
      action: (
        <ActionComp
          className="justify-end"
          edit={canStock}
          editTitle="Price & stock"
          editAction={() => setPriceRow(outletAssignment(row, outlet))}
          remove={canStock}
          deleteTitle="Remove"
          deleteAction={() => removeItem(row)}
        />
      ),
    }));
  }, [rows, offset, refresh, outlet, canStock, notify, confirm]);

  return (
    <div className="page-section">
      <CustomTable
        title="Assigned Items"
        description="Menu items sold at this outlet, their price and stock here"
        columns={canStock ? COLUMNS : READ_COLUMNS}
        dataSource={items}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={menuFilter.options}
        onFilterSearch={menuFilter.onSearch}
        filterLoading={menuFilter.loading}
        filterPlaceholder="All menus"
        addLabel="Assign Items"
        onAdd={canStock ? () => setOpenAssign(true) : undefined}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="No item assigned yet"
      />

      <OutletAssignItem
        open={openAssign}
        outlet={outlet}
        onClose={() => setOpenAssign(false)}
        onSaved={() => {
          setOpenAssign(false);
          refresh();
        }}
      />

      <OutletPriceDialog
        open={!!priceRow}
        assignment={priceRow}
        onClose={() => setPriceRow(null)}
        onSaved={() => {
          setPriceRow(null);
          refresh();
        }}
      />
    </div>
  );
}
