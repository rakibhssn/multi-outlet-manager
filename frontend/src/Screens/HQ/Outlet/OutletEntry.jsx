import React, { useState } from "react";
import { useFormik } from "formik";
import { useSetAtom } from "jotai";
import {
  CustomDialog,
  CustomSelectField,
  CustomSwitch,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { OutletValues } from "@/lib/Schema/FormValues";
import {
  OutletUpdateValidation,
  OutletValidation,
} from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";

const ACCOUNT_FIELDS = ["userEmail", "userPassword", "userConfirmPassword"];

function toFormValues(outlet, companyId) {
  if (!outlet) return { ...OutletValues, companyId: companyId ?? "" };
  const values = Object.keys(OutletValues).reduce(
    (result, key) => ({ ...result, [key]: outlet[key] ?? OutletValues[key] }),
    {},
  );
  return {
    ...values,
    companyId: outlet.parentId ?? "",
    userEmail: outlet.users?.[0]?.email ?? "",
    userPassword: "",
    userConfirmPassword: "",
  };
}

function toPayload(values) {
  const outlet = Object.fromEntries(
    Object.entries(values).filter(([key]) => !ACCOUNT_FIELDS.includes(key)),
  );
  return {
    ...outlet,
    user: {
      email: values.userEmail,
      ...(values.userPassword ? { password: values.userPassword } : {}),
    },
  };
}

export default function OutletEntry({
  open,
  outlet,
  companyId,
  companyOptions = [],
  lockCompany = false,
  onClose,
  onSaved,
}) {
  const setNotification = useSetAtom(notificationModal);
  const [loading, setLoading] = useState(false);
  const isEdit = !!outlet?.id;
  const hasAccount = !!outlet?.users?.[0];

  function handleSubmit(values) {
    setLoading(true);

    const payload = toPayload(values);

    (isEdit
      ? ApiService.put(API_LINK.OutletDetails(outlet.id), payload)
      : ApiService.post(API_LINK.Outlet, payload)
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
          description: error?.response?.data?.message ?? "Failed to save outlet",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const formik = useFormik({
    initialValues: toFormValues(outlet, companyId),
    validationSchema: hasAccount ? OutletUpdateValidation : OutletValidation,
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
      title={isEdit ? "Edit Outlet" : "Add Outlet"}
      description="Outlet details, the company it belongs to and its login account."
      submitLabel={isEdit ? "Update" : "Create"}
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <p className="form-section">Outlet</p>
        <CustomSelectField
          label="Company"
          placeholder="Select company"
          options={companyOptions}
          required
          className="form-span-2"
          disabled={lockCompany}
          value={formik.values.companyId}
          onValueChange={formik.handleChange("companyId")}
          onBlur={formik.handleBlur("companyId")}
          showError={!!(formik.touched.companyId && formik.errors.companyId)}
          error={formik.errors.companyId}
        />
        <InputField
          label="Outlet Name"
          placeholder="Tablewise Gulshan"
          required
          className="form-span-2"
          value={formik.values.name}
          onChange={formik.handleChange("name")}
          onBlur={formik.handleBlur("name")}
          showError={!!(formik.touched.name && formik.errors.name)}
          error={formik.errors.name}
        />

        <p className="form-section">Contact Person</p>
        <InputField
          label="Name"
          placeholder="Full name"
          required
          className="form-span-2"
          value={formik.values.contactPersonName}
          onChange={formik.handleChange("contactPersonName")}
          onBlur={formik.handleBlur("contactPersonName")}
          showError={!!(formik.touched.contactPersonName && formik.errors.contactPersonName)}
          error={formik.errors.contactPersonName}
        />
        <InputField
          label="Email"
          type="email"
          placeholder="contact@outlet.com"
          required
          value={formik.values.contactPersonEmail}
          onChange={formik.handleChange("contactPersonEmail")}
          onBlur={formik.handleBlur("contactPersonEmail")}
          showError={!!(formik.touched.contactPersonEmail && formik.errors.contactPersonEmail)}
          error={formik.errors.contactPersonEmail}
        />
        <InputField
          label="Phone"
          type="tel"
          placeholder="+8801XXXXXXXXX"
          required
          value={formik.values.contactPersonPhone}
          onChange={formik.handleChange("contactPersonPhone")}
          onBlur={formik.handleBlur("contactPersonPhone")}
          showError={!!(formik.touched.contactPersonPhone && formik.errors.contactPersonPhone)}
          error={formik.errors.contactPersonPhone}
        />

        <p className="form-section">Location</p>
        <CustomTextarea
          label="Address"
          placeholder="House, road, area"
          rows={2}
          required
          className="form-span-2"
          value={formik.values.address}
          onChange={formik.handleChange("address")}
          onBlur={formik.handleBlur("address")}
          showError={!!(formik.touched.address && formik.errors.address)}
          error={formik.errors.address}
        />
        <InputField
          label="City"
          placeholder="City"
          required
          value={formik.values.city}
          onChange={formik.handleChange("city")}
          onBlur={formik.handleBlur("city")}
          showError={!!(formik.touched.city && formik.errors.city)}
          error={formik.errors.city}
        />
        <InputField
          label="State"
          placeholder="State"
          required
          value={formik.values.state}
          onChange={formik.handleChange("state")}
          onBlur={formik.handleBlur("state")}
          showError={!!(formik.touched.state && formik.errors.state)}
          error={formik.errors.state}
        />
        <InputField
          label="Zip Code"
          placeholder="Zip Code"
          required
          value={formik.values.zipCode}
          onChange={formik.handleChange("zipCode")}
          onBlur={formik.handleBlur("zipCode")}
          showError={!!(formik.touched.zipCode && formik.errors.zipCode)}
          error={formik.errors.zipCode}
        />
        <InputField
          label="Country"
          placeholder="Country"
          required
          value={formik.values.country}
          onChange={formik.handleChange("country")}
          onBlur={formik.handleBlur("country")}
          showError={!!(formik.touched.country && formik.errors.country)}
          error={formik.errors.country}
        />

        <p className="form-section">Login Account</p>
        <InputField
          label="Login Email"
          type="email"
          placeholder="manager@outlet.com"
          autoComplete="off"
          required
          hint="This account is created as the outlet's Admin"
          className="form-span-2"
          value={formik.values.userEmail}
          onChange={formik.handleChange("userEmail")}
          onBlur={formik.handleBlur("userEmail")}
          showError={!!(formik.touched.userEmail && formik.errors.userEmail)}
          error={formik.errors.userEmail}
        />
        <InputField
          label={hasAccount ? "New Password" : "Password"}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          hint={hasAccount ? "Leave blank to keep the current password" : undefined}
          value={formik.values.userPassword}
          onChange={formik.handleChange("userPassword")}
          onBlur={formik.handleBlur("userPassword")}
          showError={!!(formik.touched.userPassword && formik.errors.userPassword)}
          error={formik.errors.userPassword}
        />
        <InputField
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          value={formik.values.userConfirmPassword}
          onChange={formik.handleChange("userConfirmPassword")}
          onBlur={formik.handleBlur("userConfirmPassword")}
          showError={!!(formik.touched.userConfirmPassword && formik.errors.userConfirmPassword)}
          error={formik.errors.userConfirmPassword}
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
