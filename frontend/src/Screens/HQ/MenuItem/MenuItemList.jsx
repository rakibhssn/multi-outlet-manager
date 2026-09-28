import React, { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import { ThumbCell } from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useMenuOption from "@/hooks/useMenuOption";
import useNotify from "@/hooks/useNotify";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, nameOption } from "@/lib/Functions/Common";
import { MenuItemColumn } from "@/lib/TableData/Columns";
import MenuItemEntry from "./MenuItemEntry";
import MenuItemOutlets from "./MenuItemOutlets";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

function PriceCell({ latest }) {
  if (!latest) return "—";
  const discounted = Number(latest.price) < Number(latest.basePrice);
  return (
    <div className="price-cell">
      <span className="cell-title">{formatMoney(latest.price)}</span>
      {discounted && (
        <span className="price-base">{formatMoney(latest.basePrice)}</span>
      )}
    </div>
  );
}

export default function MenuItemList({
  menuId: fixedMenuId,
  menuName,
  onChange,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotify();
  const confirm = useConfirm();
  const can = useCan();
  const canCreate = can("items.create");
  const canEdit = can("items.edit");
  const canDelete = can("items.delete");
  const embedded = !!fixedMenuId;
  const initialMenuId = fixedMenuId ?? searchParams.get("menuId") ?? "";
  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.MenuItem,
    defaults: DEFAULT_PARAMS,
    initialParams: { menuId: initialMenuId || undefined },
    filterParam: (filter) => ({ menuId: fixedMenuId || filter }),
    onFilter: (menuId) => {
      if (!fixedMenuId)
        setSearchParams(menuId ? { menuId } : {}, { replace: true });
    },
    errorText: "Failed to load menu items",
  });
  const [openModal, setOpenModal] = useState(false);
  const [item, setItem] = useState(null);
  const [outletItem, setOutletItem] = useState(null);
  const urlMenu = useMenuOption(embedded ? null : initialMenuId);

  const menuFilter = useRemoteOptions({
    url: API_LINK.Menu,
    mapOption: nameOption,
    selected: urlMenu,
    enabled: !embedded,
    errorText: "Failed to load menus",
  });

  const lockedMenu = useMemo(
    () =>
      embedded
        ? { value: fixedMenuId, label: menuName ?? "This menu" }
        : menuFilter.options.find((option) => option.value === params.menuId),
    [embedded, fixedMenuId, menuName, menuFilter.options, params.menuId],
  );

  const refresh = useCallback(() => {
    reload();
    onChange?.();
  }, [reload, onChange]);

  const openEntry = (row) => {
    setItem(row);
    setOpenModal(true);
  };

  const columns = useMemo(
    () => MenuItemColumn.filter((column) => column.key !== "menu" || !embedded),
    [embedded],
  );

  const items = useMemo(() => {
    const removeItem = (row) =>
      confirm.remove({
        title: "Remove Menu Item",
        body: `Are you sure to remove "${row.name}" and its price history?`,
        onConfirm: () =>
          notify.submit(ApiService.delete(API_LINK.MenuItemDetails(row.id)), {
            errorText: "Failed to delete menu item",
            onSuccess: () => {
              refresh();
              confirm.close();
            },
          }),
      });

    return rows.map((row, index) => ({
      key: row.id,
      id: 1 + index + offset,
      name: (
        <ThumbCell
          image={row.menuItemImage}
          title={row.name}
          subtitle={row.description}
        />
      ),
      menu: row.menu?.name,
      price: <PriceCell latest={row.menuItemPrices?.[0]} />,
      outlets: row._count?.itemOutlets ?? 0,
      status: <StatusComp type={row.status} />,
      action: (
        <ActionComp
          className="justify-end"
          view={true}
          viewTitle="Outlets Stock & prices"
          viewAction={() => setOutletItem(row)}
          edit={canEdit}
          editTitle="Edit"
          editAction={() => openEntry(row)}
          remove={canDelete}
          deleteTitle="Delete"
          deleteAction={() => removeItem(row)}
        />
      ),
    }));
  }, [rows, offset, refresh, canEdit, canDelete, notify, confirm]);

  return (
    <div className={embedded ? "page-section" : "page"}>
      {!embedded && (
        <PageHeader
          title="Menu Items"
          subtitle="Items on each menu with their current price"
        />
      )}

      <CustomTable
        title={embedded ? "Menu Items" : undefined}
        description={embedded ? "Items on this menu" : undefined}
        columns={columns}
        dataSource={items}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={embedded ? undefined : menuFilter.options}
        onFilterSearch={menuFilter.onSearch}
        filterLoading={menuFilter.loading}
        filterPlaceholder="All menus"
        defaultFilter={embedded ? "all" : initialMenuId || "all"}
        addLabel="Add Item"
        onAdd={canCreate ? () => openEntry(null) : undefined}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="No menu item has been added yet"
      />

      <MenuItemEntry
        open={openModal}
        item={item}
        menuId={params.menuId}
        lockedMenu={lockedMenu}
        lockMenu={embedded}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          refresh();
        }}
      />

      <MenuItemOutlets
        open={!!outletItem}
        item={outletItem}
        onClose={() => {
          setOutletItem(null);
          reload();
        }}
        onChange={onChange}
      />
    </div>
  );
}
