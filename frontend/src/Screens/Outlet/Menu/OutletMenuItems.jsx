import React, { useMemo } from "react";
import { useSearchParams } from "react-router";
import { CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import { StockCell, ThumbCell } from "@/Screens/Layout/TableCells";
import useMenuOption from "@/hooks/useMenuOption";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, nameOption } from "@/lib/Functions/Common";
import { OutletMenuItemColumn } from "@/lib/TableData/Columns";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "name",
  order_by: "asc",
};

function OutletItemPrice({ row }) {
  const overridden = row.outletPrice !== null && row.outletPrice !== undefined;
  return (
    <div className="price-cell">
      <span className={overridden ? "price-override" : undefined}>
        {formatMoney(row.effectivePrice)}
      </span>
      {overridden && row.defaultPrice !== row.effectivePrice && (
        <span className="price-base">{formatMoney(row.defaultPrice)}</span>
      )}
    </div>
  );
}

export default function OutletMenuItems() {
  const scope = useScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMenuId = searchParams.get("menuId") ?? "";
  const urlMenu = useMenuOption(initialMenuId);
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.MenuItem,
    defaults: DEFAULT_PARAMS,
    initialParams: {
      outletId: scope.outletId || undefined,
      menuId: initialMenuId || undefined,
    },
    filterParam: "menuId",
    onFilter: (menuId) =>
      setSearchParams(menuId ? { menuId } : {}, { replace: true }),
    enabled: !!scope.outletId,
    errorText: "Failed to load menu items",
  });

  const menuFilter = useRemoteOptions({
    url: API_LINK.Menu,
    params: { outletId: scope.outletId || undefined },
    mapOption: nameOption,
    selected: urlMenu,
    enabled: !!scope.outletId,
    errorText: "Failed to load menus",
  });

  const items = useMemo(
    () =>
      rows.map((row, index) => ({
        key: row.id,
        id: 1 + index + offset,
        name: (
          <ThumbCell
            image={row.menuItemImage}
            title={row.name}
            subtitle={row.description}
          />
        ),
        menu: <span className="cell-title">{row.menu?.name}</span>,
        price: <OutletItemPrice row={row} />,
        stock: <StockCell stock={row.stock} />,
        status: <StatusComp type={row.status} />,
      })),
    [rows, offset],
  );

  return (
    <div className="page">
      <PageHeader
        title="Menu Items"
        subtitle={`Items assigned to ${scope.outletName ?? "this outlet"} with their price and stock here`}
      />

      <CustomTable
        columns={OutletMenuItemColumn}
        dataSource={items}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={menuFilter.options}
        filterPlaceholder="All menus"
        defaultFilter={initialMenuId || "all"}
        onFilterSearch={menuFilter.onSearch}
        filterLoading={menuFilter.loading}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="No menu item has been assigned to this outlet yet"
      />
    </div>
  );
}
