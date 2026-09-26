import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { MenuColumn } from "@/lib/TableData/Columns";
import { confirmModal, emptyNotifyData, notificationModal } from "@/lib/Variables";
import MenuEntry from "./MenuEntry";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const SEARCH_DEBOUNCE = 400;

export default function MenuList() {
  const navigate = useNavigate();
  const [, setConfirmation] = useAtom(confirmModal);
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [menuData, setMenuData] = useState(undefined);
  const [openModal, setOpenModal] = useState(false);

  const fetchMenus = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.Menu, { params })
      .then((res) => {
        if (res.status === "success") {
          setData({ data: res?.data ?? [], total: res?.total ?? 0 });
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
            type: "error",
          });
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load menus",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params, setNotification]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);


  const toggleStatus = useCallback((menu) => {
    ApiService.patch(API_LINK.MenuStatus(menu.id))
      .then((res) => {
        setNotification({
          open: true,
          title: res.status === "success" ? "Success" : "Error",
          description: res?.message,
          type: res.status === "success" ? "success" : "error",
        });
        if (res.status === "success") fetchMenus();
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to change status",
          type: "error",
        });
      });
  }, [fetchMenus, setNotification]);

  const removeMenu = useCallback((menu) => {
    ApiService.delete(API_LINK.MenuDetails(menu.id))
      .then((res) => {
        setNotification({
          open: true,
          title: res.status === "success" ? "Success" : "Error",
          description: res?.message,
          type: res.status === "success" ? "success" : "error",
        });
        if (res.status === "success") {
          fetchMenus();
          setConfirmation(emptyNotifyData);
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to delete menu",
          type: "error",
        });
      });
  }, [fetchMenus, setConfirmation, setNotification]);

  const handleDelete = useCallback((menu) => {
    const confirmationPayload = {
      open: true,
      title: "Remove Menu",
      description: "",
      body: `Are you sure to remove "${menu.name}"?`,
      type: "success",
      footer: true,
      cancelButton: true,
      remove: true,
      submitLabel: "Delete",
      submitClick: () => removeMenu(menu),
    };

    setConfirmation(confirmationPayload);
  }, [removeMenu, setConfirmation]);

  const menus = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((menu, index) => ({
      key: menu.id,
      id: 1 + index + offset,
      name: (
        <div className="menu-cell">
          {menu.menuImage ? (
            <img src={menu.menuImage} alt={menu.name} className="menu-thumb" />
          ) : (
            <span className="menu-thumb menu-thumb-empty">{menu.name?.charAt(0)}</span>
          )}
          <div className="cell-stack">
            <span className="cell-title">{menu.name}</span>
            {menu.description && <span className="cell-sub">{menu.description}</span>}
          </div>
        </div>
      ),
      items: menu._count?.menuItems ?? 0,
      outlets: menu.outletCount ?? 0,
      status: <StatusComp type={menu.status} onClick={() => toggleStatus(menu)} />,
      action: (
        <ActionComp
          className="justify-end"
          view={true}
          viewTitle="View"
          viewAction={() => navigate(`/hq/menu/${menu.id}`)}
          edit={true}
          editTitle="Edit"
          editAction={() => {
            setMenuData(menu);
            setOpenModal(true);
          }}
          remove={true}
          deleteTitle="Delete"
          deleteAction={() => handleDelete(menu)}
        />
      ),
    }));
  }, [data, params.page, params.per_page, navigate, toggleStatus, handleDelete]);

  const handleChanges = useCallback(({ page, pageSize, sortField, sort }) => {
    setParams((prev) => ({
      ...prev,
      page,
      per_page: pageSize,
      sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
      order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
    }));
  }, []);

  const handleSearch = useCallback((value) => {
    const search = value.trim();
    setParams((prev) => ({
      ...prev,
      page: 1,
      search_by: search || undefined,
    }));
  }, []);

  const searchTimer = useRef(null);

  const debouncedSearch = useCallback(
    (value) => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => handleSearch(value), SEARCH_DEBOUNCE);
    },
    [handleSearch],
  );

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  function handleAddAction() {
    setMenuData(undefined);
    setOpenModal(true);
  }

  return (
    <div className="page">
      <PageHeader title="Menus" subtitle="Group your items into menus and assign them to outlets" />

      <CustomTable
        columns={MenuColumn}
        dataSource={menus}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        addLabel="Add Menu"
        onAdd={handleAddAction}
        reloadAction={fetchMenus}
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
          fetchMenus();
        }}
      />
    </div>
  );
}
