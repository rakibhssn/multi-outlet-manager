import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router";
import { useAtom } from "jotai";
import { ActionComp, CustomTable, StatusComp } from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney } from "@/lib/Functions/Common";
import { MenuItemColumn } from "@/lib/TableData/Columns";
import {
  confirmModal,
  emptyNotifyData,
  notificationModal,
} from "@/lib/Variables";
import MenuItemEntry from "./MenuItemEntry";
import MenuItemOutlets from "./MenuItemOutlets";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "createdAt",
  order_by: "desc",
};

const SEARCH_DEBOUNCE = 400;

export default function MenuItemList({ menuId: fixedMenuId, onChange }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const embedded = !!fixedMenuId;
  const initialMenuId = fixedMenuId ?? searchParams.get("menuId") ?? "";
  const [, setConfirmation] = useAtom(confirmModal);
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState({
    ...DEFAULT_PARAMS,
    menuId: initialMenuId || undefined,
  });
  const [data, setData] = useState({ data: [], total: 0 });
  const [menuOptions, setMenuOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [item, setItem] = useState(null);
  const [outletItem, setOutletItem] = useState(null);

  const fetchItems = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.MenuItem, { params })
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
          description:
            error?.response?.data?.message ?? "Failed to load menu items",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params, setNotification]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    ApiService.get(API_LINK.Menu, {
      params: { per_page: 100, sort_by: "name", order_by: "asc" },
    })
      .then((res) => {
        if (res.status === "success") {
          setMenuOptions(
            (res?.data ?? []).map((menu) => ({
              label: menu.name,
              value: menu.id,
            })),
          );
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
      });
  }, [setNotification]);

  const removeItem = useCallback(
    (row) => {
      ApiService.delete(API_LINK.MenuItemDetails(row.id))
        .then((res) => {
          setNotification({
            open: true,
            title: res.status === "success" ? "Success" : "Error",
            description: res?.message,
            type: res.status === "success" ? "success" : "error",
          });
          if (res.status === "success") {
            fetchItems();
            onChange?.();
            setConfirmation(emptyNotifyData);
          }
        })
        .catch((error) => {
          setNotification({
            open: true,
            title: "Error",
            description:
              error?.response?.data?.message ?? "Failed to delete menu item",
            type: "error",
          });
        });
    },
    [fetchItems, onChange, setConfirmation, setNotification],
  );

  const handleDelete = useCallback(
    (row) => {
      const confirmationPayload = {
        open: true,
        title: "Remove Menu Item",
        description: "",
        body: `Are you sure to remove "${row.name}" and its price history?`,
        type: "success",
        footer: true,
        cancelButton: true,
        remove: true,
        submitLabel: "Delete",
        submitClick: () => removeItem(row),
      };

      setConfirmation(confirmationPayload);
    },
    [removeItem, setConfirmation],
  );

  const columns = useMemo(
    () => MenuItemColumn.filter((column) => column.key !== "menu" || !embedded),
    [embedded],
  );

  const items = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((row, index) => {
      const latest = row.menuItemPrices?.[0];
      const discounted =
        latest && Number(latest.price) < Number(latest.basePrice);

      return {
        key: row.id,
        id: 1 + index + offset,
        name: (
          <div className="menu-cell">
            {row.menuItemImage ? (
              <img
                src={row.menuItemImage}
                alt={row.name}
                className="menu-thumb"
              />
            ) : (
              <span className="menu-thumb menu-thumb-empty">
                {row.name?.charAt(0)}
              </span>
            )}
            <div className="cell-stack">
              <span className="cell-title">{row.name}</span>
              {row.description && (
                <span className="cell-sub">{row.description}</span>
              )}
            </div>
          </div>
        ),
        menu: row.menu?.name,
        price: latest ? (
          <div className="price-cell">
            <span className="cell-title">{formatMoney(latest.price)}</span>
            {discounted && (
              <span className="price-base">
                {formatMoney(latest.basePrice)}
              </span>
            )}
          </div>
        ) : (
          "—"
        ),
        outlets: row._count?.itemOutlets ?? 0,
        status: <StatusComp type={row.status} />,
        action: (
          <ActionComp
            className="justify-end"
            view={true}
            viewTitle="Outlets Stock & prices"
            viewAction={() => setOutletItem(row)}
            edit={true}
            editTitle="Edit"
            editAction={() => {
              setItem(row);
              setOpenModal(true);
            }}
            remove={true}
            deleteTitle="Delete"
            deleteAction={() => handleDelete(row)}
          />
        ),
      };
    });
  }, [data, params.page, params.per_page, handleDelete]);

  const handleChanges = useCallback(
    ({ page, pageSize, sortField, sort, filter }) => {
      const menuId = fixedMenuId || filter || undefined;
      setParams((prev) => ({
        ...prev,
        page,
        per_page: pageSize,
        sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
        order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
        menuId,
      }));
      if (!fixedMenuId)
        setSearchParams(menuId ? { menuId } : {}, { replace: true });
    },
    [fixedMenuId, setSearchParams],
  );

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
      searchTimer.current = setTimeout(
        () => handleSearch(value),
        SEARCH_DEBOUNCE,
      );
    },
    [handleSearch],
  );

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  function handleAddItem() {
    setItem(null);
    setOpenModal(true);
  }

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
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        onSearch={debouncedSearch}
        filterOptions={embedded ? undefined : menuOptions}
        filterPlaceholder="All menus"
        defaultFilter={embedded ? "all" : initialMenuId || "all"}
        addLabel="Add Item"
        onAdd={handleAddItem}
        reloadAction={fetchItems}
        showReload={true}
        searchPlaceholder="Search items..."
        emptyText="No menu item has been added yet"
      />

      <MenuItemEntry
        open={openModal}
        item={item}
        menuId={params.menuId}
        menuOptions={menuOptions}
        lockMenu={embedded}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          fetchItems();
          onChange?.();
        }}
      />

      <MenuItemOutlets
        open={!!outletItem}
        item={outletItem}
        onClose={() => {
          setOutletItem(null);
          fetchItems();
        }}
        onChange={onChange}
      />
    </div>
  );
}
