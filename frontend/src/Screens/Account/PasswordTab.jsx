import React, { useState } from "react";
import { useFormik } from "formik";
import { LuKeyRound } from "react-icons/lu";
import { AnimateButton, InputField } from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { inputProps } from "@/lib/Functions/FormField";
import { PasswordChangeValues } from "@/lib/Schema/FormValues";
import { PasswordChangeValidation } from "@/lib/Schema/FormValidation";
import SessionList from "./SessionList";

export default function PasswordTab({ sessions, onChange }) {
  const notify = useNotify();
  const [saving, setSaving] = useState(false);

  const formik = useFormik({
    initialValues: PasswordChangeValues,
    validationSchema: PasswordChangeValidation,
    onSubmit: (values, helpers) => {
      setSaving(true);
      ApiService.patch(API_LINK.AccountPassword, values)
        .then((res) => {
          helpers.resetForm();
          notify.success(res?.message);
          return onChange();
        })
        .catch((error) => {
          const fieldErrors = error?.response?.data?.fieldErrors;
          if (fieldErrors) helpers.setErrors(fieldErrors);
          notify.failure(error, "Could not change your password");
        })
        .finally(() => setSaving(false));
    },
  });

  return (
    <div className="account-tab">
      <section className="account-card">
        <div className="account-card-head">
          <h2 className="account-card-title">Change password</h2>
          <p className="account-card-text">
            Your current password is required, and the new one must be at least
            8 characters. Every other device is signed out once it changes.
          </p>
        </div>
        <form
          onSubmit={formik.handleSubmit}
          noValidate
          className="account-form"
        >
          <InputField
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            {...inputProps(formik, "currentPassword")}
          />
          <InputField
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            {...inputProps(formik, "newPassword")}
          />
          <InputField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            {...inputProps(formik, "confirmPassword")}
          />
          <AnimateButton
            type="submit"
            preIcon={LuKeyRound}
            label="Change password"
            loading={saving}
            className="account-submit"
          />
        </form>
      </section>

      <SessionList sessions={sessions} onChange={onChange} />
    </div>
  );
}
