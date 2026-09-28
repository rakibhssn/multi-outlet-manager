import React, { useState } from "react";
import { useFormik } from "formik";
import {
  CustomDialog,
  CustomImageField,
  CustomSwitch,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { MenuValues } from "@/lib/Schema/FormValues";
import { MenuValidation } from "@/lib/Schema/FormValidation";
import { inputProps } from "@/lib/Functions/FormField";

function toFormValues(menu) {
  if (!menu) return MenuValues;
  return Object.keys(MenuValues).reduce(
    (result, key) => ({ ...result, [key]: menu[key] ?? MenuValues[key] }),
    {},
  );
}

export default function MenuEntry({ open, menu, onClose, onSaved }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const isEdit = !!menu?.id;

  function handleSubmit(values) {
    setLoading(true);
    const request = isEdit
      ? ApiService.put(API_LINK.MenuDetails(menu.id), values)
      : ApiService.post(API_LINK.Menu, values);

    notify
      .submit(request, {
        errorText: "Failed to save menu",
        onSuccess: (res) => {
          onSaved?.(res?.data);
          formik.resetForm();
        },
      })
      .finally(() => setLoading(false));
  }

  const formik = useFormik({
    initialValues: toFormValues(menu),
    validationSchema: MenuValidation,
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
      title={isEdit ? "Edit Menu" : "Add Menu"}
      description="A menu groups the items you sell, like Breakfast or Drinks."
      submitLabel={isEdit ? "Update" : "Create"}
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <InputField
          label="Menu Name"
          placeholder="Breakfast"
          required
          className="form-span-2"
          {...inputProps(formik, "name")}
        />
        <CustomTextarea
          label="Description"
          placeholder="Served every day from 7 AM to 11 AM"
          rows={3}
          maxLength={300}
          className="form-span-2"
          {...inputProps(formik, "description")}
        />
        <CustomImageField
          label="Image"
          folder="menu"
          className="form-span-2"
          {...inputProps(formik, "menuImage")}
        />
        <CustomSwitch
          name="status"
          label="Status"
          onLabel="Active"
          offLabel="Inactive"
          checked={formik.values.status === "ACTIVE"}
          onChange={(isActive) =>
            formik.setFieldValue("status", isActive ? "ACTIVE" : "INACTIVE")
          }
        />
      </form>
    </CustomDialog>
  );
}
