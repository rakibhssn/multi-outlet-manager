import React, { useState } from "react";
import { useFormik } from "formik";
import { CustomDialog, InputField } from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, toPriceInput } from "@/lib/Functions/Common";
import { OutletPriceValues } from "@/lib/Schema/FormValues";
import { OutletPriceValidation } from "@/lib/Schema/FormValidation";
import { inputProps } from "@/lib/Functions/FormField";

export const outletAssignment = (row, outlet) => ({
  menuItemId: row.id,
  outletId: outlet.id,
  itemName: row.name,
  outletName: outlet.name,
  price: row.outletPrice,
  stock: row.stock,
  defaultPrice: row.defaultPrice,
});

export default function OutletPriceDialog({
  open,
  assignment,
  onClose,
  onSaved,
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  function handleSubmit(values) {
    setLoading(true);
    const { menuItemId, outletId } = assignment;
    const request = ApiService.put(
      API_LINK.MenuItemOutlet(menuItemId, outletId),
      {
        price: values.price,
        stock: values.stock,
      },
    );

    notify
      .submit(request, {
        errorText: "Failed to update price and stock",
        onSuccess: () => {
          formik.resetForm();
          onSaved?.();
        },
      })
      .finally(() => setLoading(false));
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
          {...inputProps(formik, "price")}
          className="form-span-2"
        />
        <InputField
          label="Stock"
          type="number"
          min="0"
          step="1"
          required
          hint="0 means the item is stocked out at this outlet"
          {...inputProps(formik, "stock")}
          className="form-span-2"
        />
      </form>
    </CustomDialog>
  );
}
