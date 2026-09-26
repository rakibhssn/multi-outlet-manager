import React, { useState } from "react";
import { useFormik } from "formik";
import { useSetAtom } from "jotai";
import {
  CustomDialog,
  CustomImageField,
  CustomSwitch,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { MenuValues } from "@/lib/Schema/FormValues";
import { MenuValidation } from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";

function toFormValues(menu) {
  if (!menu) return MenuValues;
  return Object.keys(MenuValues).reduce(
    (result, key) => ({ ...result, [key]: menu[key] ?? MenuValues[key] }),
    {},
  );
}

export default function MenuEntry({ open, menu, onClose, onSaved }) {
  const setNotification = useSetAtom(notificationModal);
  const [loading, setLoading] = useState(false);
  const isEdit = !!menu?.id;

  function handleSubmit(values) {
    setLoading(true);

    (isEdit
      ? ApiService.put(API_LINK.MenuDetails(menu.id), values)
      : ApiService.post(API_LINK.Menu, values)
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
          description: error?.response?.data?.message ?? "Failed to save menu",
        });
      })
      .finally(() => {
        setLoading(false);
      });
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
          value={formik.values.name}
          onChange={formik.handleChange("name")}
          onBlur={formik.handleBlur("name")}
          showError={!!(formik.touched.name && formik.errors.name)}
          error={formik.errors.name}
        />
        <CustomTextarea
          label="Description"
          placeholder="Served every day from 7 AM to 11 AM"
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
          folder="menu"
          className="form-span-2"
          value={formik.values.menuImage}
          onChange={formik.handleChange("menuImage")}
          onBlur={formik.handleBlur("menuImage")}
          showError={!!(formik.touched.menuImage && formik.errors.menuImage)}
          error={formik.errors.menuImage}
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
