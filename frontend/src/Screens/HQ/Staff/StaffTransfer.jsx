import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import { useAtom } from "jotai";
import { format, parseISO } from "date-fns";
import {
  CustomDatepicker,
  CustomDialog,
  CustomSelectField,
  CustomTextarea,
} from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { StaffTransferValues } from "@/lib/Schema/FormValues";
import { StaffTransferValidation } from "@/lib/Schema/FormValidation";
import { notificationModal } from "@/lib/Variables";

export default function StaffTransfer({ open, staff, outletOptions = [], onClose, onSaved }) {
  const [, setNotification] = useAtom(notificationModal);
  const [loading, setLoading] = useState(false);

  const postedSince = staff?.assignments?.[0]?.startDate;
  const minDate = postedSince ? parseISO(String(postedSince).slice(0, 10)) : undefined;
  const fullName = staff ? `${staff.firstName} ${staff.lastName}` : "";

  const options = useMemo(
    () => outletOptions.filter((option) => option.value !== staff?.branchId),
    [outletOptions, staff?.branchId],
  );

  function handleSubmit(values) {
    setLoading(true);

    ApiService.post(API_LINK.StaffTransfer(staff.id), {
      branchId: values.branchId,
      transferDate: values.transferDate,
      note: values.note,
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
          description: error?.response?.data?.message ?? "Failed to transfer staff",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const formik = useFormik({
    initialValues: {
      ...StaffTransferValues,
      transferDate: format(new Date(), "yyyy-MM-dd"),
    },
    validationSchema: StaffTransferValidation,
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
      title="Transfer Staff"
      description={`Move ${fullName} to another outlet. The current posting is closed on the transfer date.`}
      submitLabel="Transfer"
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <div className="transfer-current form-span-2">
          <span className="transfer-current-label">Currently at</span>
          <span className="cell-title">{staff?.outlet?.name ?? "No outlet"}</span>
          {staff?.outlet?.parent?.name && (
            <span className="cell-sub">{staff.outlet.parent.name}</span>
          )}
          {minDate && (
            <span className="cell-sub">Since {format(minDate, "dd MMM yyyy")}</span>
          )}
        </div>
        <CustomSelectField
          label="Transfer To"
          placeholder="Select outlet"
          options={options}
          required
          className="form-span-2"
          value={formik.values.branchId}
          onValueChange={formik.handleChange("branchId")}
          onBlur={formik.handleBlur("branchId")}
          showError={!!(formik.touched.branchId && formik.errors.branchId)}
          error={formik.errors.branchId}
        />
        <CustomDatepicker
          label="Transfer Date"
          required
          className="form-span-2"
          minDate={minDate}
          maxDate={new Date()}
          clearable={false}
          value={formik.values.transferDate}
          onChange={(date) =>
            formik.handleChange("transferDate")(date ? format(date, "yyyy-MM-dd") : "")
          }
          onBlur={formik.handleBlur("transferDate")}
          showError={!!(formik.touched.transferDate && formik.errors.transferDate)}
          error={formik.errors.transferDate}
        />
        <CustomTextarea
          label="Note"
          placeholder="Reason for the transfer"
          maxLength={255}
          className="form-span-2"
          value={formik.values.note}
          onChange={formik.handleChange("note")}
          onBlur={formik.handleBlur("note")}
          showError={!!(formik.touched.note && formik.errors.note)}
          error={formik.errors.note}
        />
      </form>
    </CustomDialog>
  );
}
