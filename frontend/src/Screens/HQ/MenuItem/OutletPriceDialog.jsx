import React, { useState } from "react";
import { useFormik } from "formik";
import { useAtom } from "jotai";
import { CustomDialog, InputField } from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, toPriceInput } from "@/lib/Functions/Common";
import { OutletPriceValues } from "@/lib/Schema/FormValues";
import { OutletPriceValidation } from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";

export default function OutletPriceDialog({ open, assignment, onClose, onSaved }) {
  const [, setNotification] = useAtom(notificationModal);
  const [loading, setLoading] = useState(false);

  function handleSubmit(values) {
    setLoading(true);

    ApiService.put(API_LINK.MenuItemOutlet(assignment.menuItemId, assignment.outletId), {
      price: values.price,
      stock: values.stock,
    })
      .then((res) => {
        setNotification({
          open: true,
          title: res.status === "success" ? "Success" : "Error",
          description: res?.message,
          type: res.status === "success" ? "success" : "error",
        });
        if (res.status === "success") {
          formik.resetForm();
          onSaved?.();
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to update price and stock",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const formik = useFormik({
    initialValues: {
      ...OutletPriceValues,
      price: toPriceInput(assignment?.price),
      stock: String(assignment?.stock ?? 0),
    },
    validationSchema: OutletPriceValidation,
    enableReinitialize: true,
    onSubmit: handleSubmit,
  });

  return (
    <CustomDialog
      open={open}
      openChange={(next) => {
        if (!next) {
          formik.resetForm();
          onClose?.();
        }
      }}
      title="Price & Stock"
      description={`${assignment?.itemName ?? ""} at ${assignment?.outletName ?? ""}`}
      submitLabel="Save"
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <InputField
          label="Outlet Price"
          type="number"
          min="0"
          step="0.01"
          placeholder={formatMoney(assignment?.defaultPrice)}
          hint={`Leave empty to use the default price (${formatMoney(assignment?.defaultPrice)})`}
          value={formik.values.price}
          onChange={formik.handleChange("price")}
          onBlur={formik.handleBlur("price")}
          showError={!!(formik.touched.price && formik.errors.price)}
          error={formik.errors.price}
          className="form-span-2"
        />
        <InputField
          label="Stock"
          type="number"
          min="0"
          step="1"
          required
          hint="0 means the item is stocked out at this outlet"
          value={formik.values.stock}
          onChange={formik.handleChange("stock")}
          onBlur={formik.handleBlur("stock")}
          showError={!!(formik.touched.stock && formik.errors.stock)}
          error={formik.errors.stock}
          className="form-span-2"
        />
      </form>
    </CustomDialog>
  );
}
