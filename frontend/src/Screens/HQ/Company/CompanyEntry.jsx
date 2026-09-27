import React, { useState } from "react";
import { useFormik } from "formik";
import {
  CustomDialog,
  CustomSwitch,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { CompanyValues } from "@/lib/Schema/FormValues";
import {
  CompanyUpdateValidation,
  CompanyValidation,
} from "@/lib/Schema/FormValidation";
import { inputProps } from "@/lib/Functions/FormField";

const ACCOUNT_FIELDS = ["userEmail", "userPassword", "userConfirmPassword"];

function toFormValues(company) {
  if (!company) return CompanyValues;
  const account = company.users?.[0];
  const values = Object.keys(CompanyValues).reduce(
    (result, key) => ({ ...result, [key]: company[key] ?? CompanyValues[key] }),
    {},
  );
  return {
    ...values,
    userEmail: account?.email ?? "",
    userPassword: "",
    userConfirmPassword: "",
  };
}

function toPayload(values) {
  const company = Object.fromEntries(
    Object.entries(values).filter(([key]) => !ACCOUNT_FIELDS.includes(key)),
  );
  return {
    ...company,
    user: {
      email: values.userEmail,
      ...(values.userPassword ? { password: values.userPassword } : {}),
    },
  };
}

export default function CompanyEntry({ open, company, onClose, onSaved }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const isEdit = !!company?.id;
  const hasAccount = !!company?.users?.[0];

  function handleSubmit(values) {
    setLoading(true);
    const payload = toPayload(values);
    const request = isEdit
      ? ApiService.put(API_LINK.CompanyDetails(company.id), payload)
      : ApiService.post(API_LINK.Company, payload);

    notify
      .submit(request, {
        errorText: "Failed to save company",
        onSuccess: (res) => {
          onSaved?.(res?.data);
          formik.resetForm();
        },
      })
      .finally(() => setLoading(false));
  }

  const formik = useFormik({
    initialValues: toFormValues(company),
    validationSchema: hasAccount ? CompanyUpdateValidation : CompanyValidation,
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
      title={isEdit ? "Edit Company" : "Add Company"}
      description="Company details, contact person and the login account."
      submitLabel={isEdit ? "Update" : "Create"}
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
      className="company-entry"
      bodyClassName="company-entry-body"
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <p className="form-section">Company</p>
        <InputField
          label="Company Name"
          placeholder="Tablewise Gulshan"
          required
          className="form-span-2"
          {...inputProps(formik, "name")}
        />

        <p className="form-section">Contact Person</p>
        <InputField
          label="Name"
          placeholder="Full name"
          required
          className="form-span-2"
          {...inputProps(formik, "contactPersonName")}
        />
        <InputField
          label="Email"
          type="email"
          placeholder="contact@company.com"
          required
          {...inputProps(formik, "contactPersonEmail")}
        />
        <InputField
          label="Phone"
          type="tel"
          placeholder="+8801XXXXXXXXX"
          required
          {...inputProps(formik, "contactPersonPhone")}
        />

        <p className="form-section">Location</p>
        <CustomTextarea
          label="Address"
          placeholder="House, road, area"
          rows={2}
          required
          className="form-span-2"
          {...inputProps(formik, "address")}
        />
        <InputField
          label="City"
          placeholder="City "
          required
          {...inputProps(formik, "city")}
        />
        <InputField
          label="State"
          placeholder="State"
          required
          {...inputProps(formik, "state")}
        />
        <InputField
          label="Zip Code"
          placeholder="Zip Code"
          required
          {...inputProps(formik, "zipCode")}
        />
        <InputField
          label="Country"
          placeholder="Country"
          required
          {...inputProps(formik, "country")}
        />

        <p className="form-section">Login Account</p>
        <InputField
          label="Login Email"
          type="email"
          placeholder="admin@company.com"
          autoComplete="off"
          required
          hint="This account is created as the company's Super Admin"
          className="form-span-2"
          {...inputProps(formik, "userEmail")}
        />
        <InputField
          label={hasAccount ? "New Password" : "Password"}
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          hint={
            hasAccount ? "Leave blank to keep the current password" : undefined
          }
          {...inputProps(formik, "userPassword")}
        />
        <InputField
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required={!hasAccount}
          {...inputProps(formik, "userConfirmPassword")}
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
