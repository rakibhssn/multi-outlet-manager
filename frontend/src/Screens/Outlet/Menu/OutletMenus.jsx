import React, { useMemo } from "react";
import { useNavigate } from "react-router";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import { ThumbCell } from "@/Screens/Layout/TableCells";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import { API_LINK } from "@/lib/API_LINK";
import { OutletMenuColumn } from "@/lib/TableData/Columns";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "name",
  order_by: "asc",
};

export default function OutletMenus() {
  const navigate = useNavigate();
  const scope = useScope();
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.Menu,
    defaults: DEFAULT_PARAMS,
    initialParams: { outletId: scope.outletId || undefined },
    errorText: "Failed to load menus",
  });

  const menus = useMemo(
    () =>
      rows.map((menu, index) => ({
        key: menu.id,
        id: 1 + index + offset,
        name: (
          <ThumbCell
            image={menu.menuImage}
            title={menu.name}
            subtitle={menu.description}
          />
        ),
        items: (
          <span className="stock-count">{menu._count?.menuItems ?? 0}</span>
        ),
        status: <StatusComp type={menu.status} />,
        action: (
          <ActionComp
            className="justify-end"
            view={true}
            viewTitle="View items"
            viewAction={() => navigate(`/outlet/menu-item?menuId=${menu.id}`)}
          />
        ),
      })),
    [rows, offset, navigate],
  );

  return (
    <div className="page">
      <PageHeader
        title="Menus"
        subtitle={`Menus with items assigned to ${scope.outletName ?? "this outlet"}`}
      />

      <CustomTable
        columns={OutletMenuColumn}
        dataSource={menus}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search menus..."
        emptyText="No menu item has been assigned to this outlet yet"
      />
    </div>
  );
}
