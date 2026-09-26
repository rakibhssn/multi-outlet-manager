import React, { useState } from "react";
import { useFormik } from "formik";
import { useSetAtom } from "jotai";
import {
  CustomDialog,
  CustomImageField,
  CustomSelectField,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { ITEM_STATUS_OPTIONS } from "@/lib/Constant";
import { MenuItemValues } from "@/lib/Schema/FormValues";
import { MenuItemValidation } from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";

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
  menuOptions = [],
  lockMenu = false,
  onClose,
  onSaved,
}) {
  const setNotification = useSetAtom(notificationModal);
  const [loading, setLoading] = useState(false);
  const isEdit = !!item?.id;

  function handleSubmit(values) {
    setLoading(true);

    (isEdit
      ? ApiService.put(API_LINK.MenuItemDetails(item.id), values)
      : ApiService.post(API_LINK.MenuItem, values)
    )
      .then((res) => {
        if (res.status === "success") {
          setNotification({
            open: true,
            title: "Success",
            description: res?.message,
          });
          onSaved?.(res?.data);
          formik.resetForm();
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
          });
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to save menu item",
        });
      })
      .finally(() => {
        setLoading(false);
      });
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
        <CustomSelectField
          label="Menu"
          placeholder="Select menu"
          options={menuOptions}
          disabled={lockMenu}
          required
          className="form-span-2"
          value={formik.values.menuId}
          onValueChange={formik.handleChange("menuId")}
          onBlur={formik.handleBlur("menuId")}
          showError={!!(formik.touched.menuId && formik.errors.menuId)}
          error={formik.errors.menuId}
        />
        <InputField
          label="Item Name"
          placeholder="Beef Tehari"
          required
          className="form-span-2"
          value={formik.values.name}
          onChange={formik.handleChange("name")}
          onBlur={formik.handleBlur("name")}
          showError={!!(formik.touched.name && formik.errors.name)}
          error={formik.errors.name}
        />
        <CustomTextarea
          label="Description"
          placeholder="Ingredients, portion size, spice level"
          rows={3}
          maxLength={300}
          className="form-span-2"
          value={formik.values.description}
          onChange={formik.handleChange("description")}
          onBlur={formik.handleBlur("description")}
          showError={!!(formik.touched.description && formik.errors.description)}
          error={formik.errors.description}
        />
        <CustomImageField
          label="Image"
          folder="menu-item"
          className="form-span-2"
          value={formik.values.menuItemImage}
          onChange={formik.handleChange("menuItemImage")}
          onBlur={formik.handleBlur("menuItemImage")}
          showError={!!(formik.touched.menuItemImage && formik.errors.menuItemImage)}
          error={formik.errors.menuItemImage}
        />

        <p className="form-section">Price & Availability</p>
        <InputField
          label="Base Price"
          type="number"
          placeholder="0.00"
          required
          min="0"
          step="0.01"
          value={formik.values.basePrice}
          onChange={formik.handleChange("basePrice")}
          onBlur={formik.handleBlur("basePrice")}
          showError={!!(formik.touched.basePrice && formik.errors.basePrice)}
          error={formik.errors.basePrice}
        />
        <InputField
          label="Selling Price"
          type="number"
          placeholder="Same as base price"
          min="0"
          step="0.01"
          hint="Leave empty to sell at the base price"
          value={formik.values.price}
          onChange={formik.handleChange("price")}
          onBlur={formik.handleBlur("price")}
          showError={!!(formik.touched.price && formik.errors.price)}
          error={formik.errors.price}
        />
        <CustomSelectField
          label="Status"
          placeholder="Select status"
          options={ITEM_STATUS_OPTIONS}
          required
          value={formik.values.status}
          onValueChange={formik.handleChange("status")}
          onBlur={formik.handleBlur("status")}
          showError={!!(formik.touched.status && formik.errors.status)}
          error={formik.errors.status}
        />
      </form>
    </CustomDialog>
  );
}
