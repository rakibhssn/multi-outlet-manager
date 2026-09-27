import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import {
  AutoCompleteField,
  CustomDialog,
  CustomImageField,
  CustomSelectField,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { ITEM_STATUS_OPTIONS } from "@/lib/Constant";
import { nameOption } from "@/lib/Functions/Common";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import { MenuItemValues } from "@/lib/Schema/FormValues";
import { MenuItemValidation } from "@/lib/Schema/FormValidation";
import { inputProps, selectProps } from "@/lib/Functions/FormField";

function toFormValues(item, menuId) {
  if (!item) return { ...MenuItemValues, menuId: menuId ?? "" };
  const latest = item.menuItemPrices?.[0];
  const values = Object.keys(MenuItemValues).reduce(
    (result, key) => ({ ...result, [key]: item[key] ?? MenuItemValues[key] }),
    {},
  );
  return {
    ...values,
    basePrice: latest ? String(Number(latest.basePrice)) : "",
    price: latest ? String(Number(latest.price)) : "",
  };
}

export default function MenuItemEntry({
  open,
  item,
  menuId,
  lockedMenu,
  lockMenu = false,
  onClose,
  onSaved,
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const isEdit = !!item?.id;
  const selectedMenu = useMemo(
    () => (isEdit ? nameOption(item?.menu) : (lockedMenu ?? null)),
    [isEdit, item?.menu, lockedMenu],
  );
  const menus = useRemoteOptions({
    url: API_LINK.Menu,
    mapOption: nameOption,
    selected: selectedMenu,
    enabled: open && !lockMenu,
    errorText: "Failed to load menus",
  });

  function handleSubmit(values) {
    setLoading(true);
    const request = isEdit
      ? ApiService.put(API_LINK.MenuItemDetails(item.id), values)
      : ApiService.post(API_LINK.MenuItem, values);

    notify
      .submit(request, {
        errorText: "Failed to save menu item",
        onSuccess: (res) => {
          onSaved?.(res?.data);
          formik.resetForm();
        },
      })
      .finally(() => setLoading(false));
  }

  const formik = useFormik({
    initialValues: toFormValues(item, menuId),
    validationSchema: MenuItemValidation,
    enableReinitialize: true,
    onSubmit: handleSubmit,
  });

  const handleClose = () => {
    formik.resetForm();
    onClose?.();
  };

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && handleClose()}
      title={isEdit ? "Edit Menu Item" : "Add Menu Item"}
      description="The item, the menu it belongs to and its price."
      submitLabel={isEdit ? "Update" : "Create"}
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <p className="form-section">Item</p>
        <AutoCompleteField
          label="Menu"
          placeholder="Search menu"
          options={menus.options}
          onSearch={menus.onSearch}
          loading={menus.loading}
          filterLocally={false}
          disabled={lockMenu}
          required
          className="form-span-2"
          {...selectProps(formik, "menuId")}
        />
        <InputField
          label="Item Name"
          placeholder="Beef Tehari"
          required
          className="form-span-2"
          {...inputProps(formik, "name")}
        />
        <CustomTextarea
          label="Description"
          placeholder="Ingredients, portion size, spice level"
          rows={3}
          maxLength={300}
          className="form-span-2"
          {...inputProps(formik, "description")}
        />
        <CustomImageField
          label="Image"
          folder="menu-item"
          className="form-span-2"
          {...inputProps(formik, "menuItemImage")}
        />

        <p className="form-section">Price & Availability</p>
        <InputField
          label="Base Price"
          type="number"
          placeholder="0.00"
          required
          min="0"
          step="0.01"
          {...inputProps(formik, "basePrice")}
        />
        <InputField
          label="Selling Price"
          type="number"
          placeholder="Same as base price"
          min="0"
          step="0.01"
          hint="Leave empty to sell at the base price"
          {...inputProps(formik, "price")}
        />
        <CustomSelectField
          label="Status"
          placeholder="Select status"
          options={ITEM_STATUS_OPTIONS}
          required
          {...selectProps(formik, "status")}
        />
      </form>
    </CustomDialog>
  );
}
