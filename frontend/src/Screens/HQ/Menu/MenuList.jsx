import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import { ThumbCell } from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { MenuColumn } from "@/lib/TableData/Columns";
import MenuEntry from "./MenuEntry";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

export default function MenuList() {
  const navigate = useNavigate();
  const notify = useNotify();
  const confirm = useConfirm();
  const can = useCan();
  const canCreate = can("menus.create");
  const canEdit = can("menus.edit");
  const canDelete = can("menus.delete");
  const { rows, offset, reload, ...table } = useTableList({
    url: API_LINK.Menu,
    defaults: DEFAULT_PARAMS,
    errorText: "Failed to load menus",
  });
  const [menuData, setMenuData] = useState(undefined);
  const [openModal, setOpenModal] = useState(false);

  const openEntry = (menu) => {
    setMenuData(menu);
    setOpenModal(true);
  };

  const menus = useMemo(() => {
    const toggleStatus = (menu) =>
      notify.submit(ApiService.patch(API_LINK.MenuStatus(menu.id)), {
        errorText: "Failed to change status",
        onSuccess: reload,
      });

    const removeMenu = (menu) =>
      confirm.remove({
        title: "Remove Menu",
        body: `Are you sure to remove "${menu.name}"?`,
        onConfirm: () =>
          notify.submit(ApiService.delete(API_LINK.MenuDetails(menu.id)), {
            errorText: "Failed to delete menu",
            onSuccess: () => {
              reload();
              confirm.close();
            },
          }),
      });

    return rows.map((menu, index) => ({
      key: menu.id,
      id: 1 + index + offset,
      name: (
        <ThumbCell
          image={menu.menuImage}
          title={menu.name}
          subtitle={menu.description}
        />
      ),
      items: menu._count?.menuItems ?? 0,
      outlets: menu.outletCount ?? 0,
      status: (
        <StatusComp
          type={menu.status}
          onClick={canEdit ? () => toggleStatus(menu) : undefined}
        />
      ),
      action: (
        <ActionComp
          className="justify-end"
          view={true}
          viewTitle="View"
          viewAction={() => navigate(`/hq/menu/${menu.id}`)}
          edit={canEdit}
          editTitle="Edit"
          editAction={() => openEntry(menu)}
          remove={canDelete}
          deleteTitle="Delete"
          deleteAction={() => removeMenu(menu)}
        />
      ),
    }));
  }, [rows, offset, reload, canEdit, canDelete, navigate, notify, confirm]);

  return (
    <div className="page">
      <PageHeader
        title="Menus"
        subtitle="Group your items into menus and assign them to outlets"
      />

      <CustomTable
        columns={MenuColumn}
        dataSource={menus}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={table.params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        addLabel="Add Menu"
        onAdd={canCreate ? () => openEntry(undefined) : undefined}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search menus..."
        emptyText="No menu has been created yet"
      />

      <MenuEntry
        open={openModal}
        menu={menuData}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          reload();
        }}
      />
    </div>
  );
}
