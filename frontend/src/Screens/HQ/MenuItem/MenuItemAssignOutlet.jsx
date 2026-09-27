import React, { useCallback, useEffect, useState } from "react";
import { CustomDialog } from "@/components/custom";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import AssignPriceList, { assignError } from "./AssignPriceList";

export default function MenuItemAssignOutlet({ open, item, onClose, onSaved }) {
  const scope = useScope();
  const notify = useNotify();
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);

  const mapOutlet = useCallback(
    (outlet) => ({
      value: outlet.id,
      label: outlet.name,
      sub: scope.companyId ? outlet.city : outlet.parent?.name,
      defaultPrice: item?.defaultPrice,
    }),
    [scope.companyId, item?.defaultPrice],
  );

  const outlets = useRemoteOptions({
    url: API_LINK.Outlet,
    params: {
      companyId: scope.companyId || undefined,
      excludeMenuItemId: item?.id,
    },
    mapOption: mapOutlet,
    enabled: open && !!item?.id,
    errorText: "Failed to load outlets",
  });
  const resetOutletSearch = outlets.onSearch;

  useEffect(() => {
    if (!open || !item?.id) return;
    setSelected({});
    resetOutletSearch("");
  }, [open, item?.id, resetOutletSearch]);

  function handleSubmit() {
    const outlets = Object.entries(selected).map(([outletId, values]) => ({
      outletId,
      price: values.price,
      stock: values.stock,
    }));

    const invalid = assignError(outlets, "Select at least one outlet");
    if (invalid) {
      notify.error(invalid);
      return;
    }

    setLoading(true);

    notify
      .submit(ApiService.post(API_LINK.MenuItemOutlets(item.id), { outlets }), {
        errorText: "Failed to assign outlets",
        onSuccess: () => onSaved?.(),
      })
      .finally(() => setLoading(false));
  }

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title="Assign Outlets"
      description={`Choose where "${item?.name ?? ""}" is sold. Leave the price empty to use the default; stock starts at 0 if empty.`}
      submitLabel="Assign"
      submitLoading={loading}
      submitDisabled={!Object.keys(selected).length}
      onSubmit={handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <AssignPriceList
        options={outlets.options}
        selected={selected}
        onChange={setSelected}
        onSearch={outlets.onSearch}
        loading={outlets.loading}
        searchPlaceholder="Search outlet or city..."
        emptyText="This item is already sold at every outlet."
      />
    </CustomDialog>
  );
}
