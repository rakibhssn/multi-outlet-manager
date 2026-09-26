import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { CustomDialog } from "@/components/custom";
import useScope from "@/hooks/useScope";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { isValidOutletPrice, isValidStock } from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";
import AssignPriceList from "./AssignPriceList";

export default function MenuItemAssignOutlet({ open, item, onClose, onSaved }) {
  const scope = useScope();
  const [, setNotification] = useAtom(notificationModal);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !item?.id) return;
    setSelected({});

    Promise.all([
      ApiService.get(API_LINK.Outlet, {
        params: {
          per_page: 100,
          sort_by: "name",
          order_by: "asc",
          companyId: scope.companyId || undefined,
        },
      }),
      ApiService.get(API_LINK.MenuItemOutlets(item.id), { params: { per_page: 100 } }),
    ])
      .then(([outlets, assigned]) => {
        const assignedIds = (assigned?.data ?? []).map((row) => row.branchId);
        setOptions(
          (outlets?.data ?? [])
            .filter((outlet) => !assignedIds.includes(outlet.id))
            .map((outlet) => ({
              value: outlet.id,
              label: outlet.name,
              sub: scope.companyId ? outlet.city : outlet.parent?.name,
              defaultPrice: item.defaultPrice,
            })),
        );
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load outlets",
          type: "error",
        });
      });
  }, [open, item?.id, item?.defaultPrice, scope.companyId, setNotification]);

  function handleSubmit() {
    const outlets = Object.entries(selected).map(([outletId, values]) => ({
      outletId,
      price: values.price,
      stock: values.stock,
    }));

    if (!outlets.length) {
      setNotification({ open: true, title: "Error", description: "Select at least one outlet", type: "error" });
      return;
    }
    if (outlets.some((row) => !isValidOutletPrice(row.price))) {
      setNotification({ open: true, title: "Error", description: "Outlet price must be a positive number", type: "error" });
      return;
    }
    if (outlets.some((row) => !isValidStock(row.stock))) {
      setNotification({ open: true, title: "Error", description: "Stock must be a whole number of 0 or more", type: "error" });
      return;
    }

    setLoading(true);

    ApiService.post(API_LINK.MenuItemOutlets(item.id), { outlets })
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
          description: error?.response?.data?.message ?? "Failed to assign outlets",
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
      title="Assign Outlets"
      description={`Choose where "${item?.name ?? ""}" is sold. Leave the price empty to use the default; stock starts at 0 if empty.`}
      submitLabel="Assign"
      submitLoading={loading}
      submitDisabled={!options.length}
      onSubmit={handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <AssignPriceList
        options={options}
        selected={selected}
        onChange={setSelected}
        emptyText="This item is already sold at every outlet."
      />
    </CustomDialog>
  );
}
