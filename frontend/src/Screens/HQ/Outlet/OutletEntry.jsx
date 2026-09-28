import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import {
  AutoCompleteField,
  CustomDialog,
  CustomSelectField,
  CustomSwitch,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { nameOption } from "@/lib/Functions/Common";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useRoleOptions from "@/hooks/useRoleOptions";
import { OutletValues } from "@/lib/Schema/FormValues";
import {
  OutletUpdateValidation,
  OutletValidation,
} from "@/lib/Schema/FormValidation";
import { inputProps, selectProps } from "@/lib/Functions/FormField";

const ACCOUNT_FIELDS = [
  "userEmail",
  "userRoleId",
  "userPassword",
  "userConfirmPassword",
];

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
    userRoleId: outlet.users?.[0]?.role?.id ?? "",
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
      roleId: values.userRoleId,
      ...(values.userPassword ? { password: values.userPassword } : {}),
    },
  };
}

export default function OutletEntry({
  open,
  outlet,
  companyId,
  lockedCompany,
  lockCompany = false,
  onClose,
  onSaved,
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);
  const isEdit = !!outlet?.id;
  const hasAccount = !!outlet?.users?.[0];
  const selectedCompany = useMemo(
    () => (isEdit ? nameOption(outlet?.parent) : (lockedCompany ?? null)),
    [isEdit, outlet?.parent, lockedCompany],
  );
  const companies = useRemoteOptions({
    url: API_LINK.Company,
    mapOption: nameOption,
    selected: selectedCompany,
    enabled: open && !lockCompany,
    errorText: "Failed to load companies",
  });

  function handleSubmit(values) {
    setLoading(true);
    const payload = toPayload(values);
    const request = isEdit
      ? ApiService.put(API_LINK.OutletDetails(outlet.id), payload)
      : ApiService.post(API_LINK.Outlet, payload);

    notify
      .submit(request, {
        errorText: "Failed to save outlet",
        onSuccess: (res) => {
          onSaved?.(res?.data);
          formik.resetForm();
        },
      })
      .finally(() => setLoading(false));
  }

  const formik = useFormik({
    initialValues: toFormValues(outlet, companyId),
    validationSchema: hasAccount ? OutletUpdateValidation : OutletValidation,
    enableReinitialize: true,
    onSubmit: handleSubmit,
  });

  const roles = useRoleOptions({
    accountType: "OUTLET",
    companyId: formik.values.companyId,
    account: outlet?.users?.[0],
    formik,
    enabled: open,
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
        <AutoCompleteField
          label="Company"
          placeholder="Search company"
          options={companies.options}
          onSearch={companies.onSearch}
          loading={companies.loading}
          filterLocally={false}
          required
          className="form-span-2"
          disabled={lockCompany}
          {...selectProps(formik, "companyId")}
        />
        <InputField
          label="Outlet Name"
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
          placeholder="contact@outlet.com"
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
          placeholder="City"
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
          placeholder="manager@outlet.com"
          autoComplete="off"
          required
          hint="The outlet's own login account"
          {...inputProps(formik, "userEmail")}
        />
        <CustomSelectField
          label="Login Role"
          placeholder="Select role"
          options={roles.options}
          disabled={roles.loading}
          required
          hint="Decides what this outlet account can see and do"
          {...selectProps(formik, "userRoleId")}
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
