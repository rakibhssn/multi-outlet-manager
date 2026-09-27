import React, { useEffect, useMemo, useState } from "react";
import { AutoCompleteField, CustomDialog } from "@/components/custom";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { nameOption } from "@/lib/Functions/Common";
import AssignPriceList, {
  assignError,
} from "@/Screens/HQ/MenuItem/AssignPriceList";

const itemOption = (row) => ({
  value: row.id,
  label: row.name,
  sub:
    row.status === "AVAILABLE"
      ? null
      : row.status.replace(/_/g, " ").toLowerCase(),
  defaultPrice: row.defaultPrice,
});

export default function OutletAssignItem({ open, outlet, onClose, onSaved }) {
  const notify = useNotify();
  const [menu, setMenu] = useState(null);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(false);
  const menuId = menu?.value ?? "";

  const menus = useRemoteOptions({
    url: API_LINK.Menu,
    mapOption: nameOption,
    selected: menu,
    enabled: open,
    errorText: "Failed to load menus",
  });

  const itemParams = useMemo(
    () => ({ menuId, excludeOutletId: outlet?.id }),
    [menuId, outlet?.id],
  );
  const items = useRemoteOptions({
    url: API_LINK.MenuItem,
    params: itemParams,
    mapOption: itemOption,
    enabled: open && !!outlet?.id && !!menuId,
    errorText: "Failed to load menu items",
  });
  const resetItemSearch = items.onSearch;

  useEffect(() => {
    if (!open) return;
    setSelected({});
    resetItemSearch("");
  }, [open, resetItemSearch]);

  useEffect(() => {
    if (open && !menu && menus.options.length) setMenu(menus.options[0]);
  }, [open, menu, menus.options]);

  function handleSubmit() {
    const items = Object.entries(selected).map(([menuItemId, values]) => ({
      menuItemId,
      price: values.price,
      stock: values.stock,
    }));

    const invalid = assignError(items, "Select at least one item");
    if (invalid) {
      notify.error(invalid);
      return;
    }

    setLoading(true);

    notify
      .submit(ApiService.post(API_LINK.OutletItems(outlet.id), { items }), {
        errorText: "Failed to assign items",
        onSuccess: () => onSaved?.(),
      })
      .finally(() => setLoading(false));
  }

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title="Assign Items"
      description={`Choose items "${outlet?.name ?? ""}" will sell. Leave the price empty to use the default; stock starts at 0 if empty.`}
      submitLabel="Assign"
      submitLoading={loading}
      submitDisabled={!Object.keys(selected).length}
      onSubmit={handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <div className="assign-item-body">
        <AutoCompleteField
          label="Menu"
          placeholder="Search menu"
          options={menus.options}
          onSearch={menus.onSearch}
          loading={menus.loading}
          filterLocally={false}
          value={menuId}
          onValueChange={(value, _name, option) => {
            setMenu(value ? option : null);
            setSelected({});
            resetItemSearch("");
          }}
        />
        <AssignPriceList
          key={menuId}
          options={items.options}
          selected={selected}
          onChange={setSelected}
          onSearch={items.onSearch}
          loading={items.loading}
          searchPlaceholder="Search item..."
          emptyText={
            menuId
              ? "Every item of this menu is already sold here."
              : "Select a menu to see its items."
          }
        />
      </div>
    </CustomDialog>
  );
}
