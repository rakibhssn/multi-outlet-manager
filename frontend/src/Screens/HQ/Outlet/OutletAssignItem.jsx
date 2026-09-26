import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { CustomDialog, CustomSelectField } from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { isValidOutletPrice, isValidStock } from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";
import AssignPriceList from "@/Screens/HQ/MenuItem/AssignPriceList";

export default function OutletAssignItem({ open, outlet, menuOptions = [], onClose, onSaved }) {
  const [, setNotification] = useAtom(notificationModal);
  const [menuId, setMenuId] = useState("");
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setMenuId((current) => current || menuOptions[0]?.value || "");
  }, [open, menuOptions]);

  useEffect(() => {
    if (!open || !outlet?.id || !menuId) {
      setOptions([]);
      return;
    }

    ApiService.get(API_LINK.MenuItem, {
      params: {
        per_page: 100,
        sort_by: "name",
        order_by: "asc",
        menuId,
        excludeOutletId: outlet.id,
      },
    })
      .then((res) => {
        if (res.status === "success") {
          setOptions(
            (res?.data ?? []).map((row) => ({
              value: row.id,
              label: row.name,
              sub: row.status === "AVAILABLE" ? null : row.status.replace(/_/g, " ").toLowerCase(),
              defaultPrice: row.defaultPrice,
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
          description: error?.response?.data?.message ?? "Failed to load menu items",
          type: "error",
        });
      });
  }, [open, outlet?.id, menuId, setNotification]);

  function handleSubmit() {
    const items = Object.entries(selected).map(([menuItemId, values]) => ({
      menuItemId,
      price: values.price,
      stock: values.stock,
    }));

    if (!items.length) {
      setNotification({ open: true, title: "Error", description: "Select at least one item", type: "error" });
      return;
    }
    if (items.some((row) => !isValidOutletPrice(row.price))) {
      setNotification({ open: true, title: "Error", description: "Outlet price must be a positive number", type: "error" });
      return;
    }
    if (items.some((row) => !isValidStock(row.stock))) {
      setNotification({ open: true, title: "Error", description: "Stock must be a whole number of 0 or more", type: "error" });
      return;
    }

    setLoading(true);

    ApiService.post(API_LINK.OutletItems(outlet.id), { items })
      .then((res) => {
        setNotification({
          open: true,
          title: res.status === "success" ? "Success" : "Error",
          description: res?.message,
          type: res.status === "success" ? "success" : "error",
        });
        if (res.status === "success") onSaved?.();
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to assign items",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title="Assign Items"
      description={`Choose items "${outlet?.name ?? ""}" will sell. Leave the price empty to use the default; stock starts at 0 if empty.`}
      submitLabel="Assign"
      submitLoading={loading}
      submitDisabled={!options.length}
      onSubmit={handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <div className="assign-item-body">
        <CustomSelectField
          label="Menu"
          placeholder="Select menu"
          options={menuOptions}
          value={menuId}
          onValueChange={(value) => {
            setMenuId(value ?? "");
            setSelected({});
          }}
        />
        <AssignPriceList
          options={options}
          selected={selected}
          onChange={setSelected}
          emptyText={
            menuId ? "Every item of this menu is already sold here." : "Select a menu to see its items."
          }
        />
      </div>
    </CustomDialog>
  );
}
