import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import { format, parseISO } from "date-fns";
import {
  AutoCompleteField,
  CustomDatepicker,
  CustomDialog,
  CustomTextarea,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { fullName, outletOption } from "@/lib/Functions/Common";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import { StaffTransferValues } from "@/lib/Schema/FormValues";
import { StaffTransferValidation } from "@/lib/Schema/FormValidation";
import { dateProps, inputProps, selectProps } from "@/lib/Functions/FormField";

export default function StaffTransfer({ open, staff, onClose, onSaved }) {
  const notify = useNotify();
  const scope = useScope();
  const outlets = useRemoteOptions({
    url: API_LINK.Outlet,
    params: { companyId: scope.companyId || undefined },
    mapOption: outletOption,
    enabled: open,
    errorText: "Failed to load outlets",
  });
  const [loading, setLoading] = useState(false);

  const postedSince = staff?.assignments?.[0]?.startDate;
  const minDate = postedSince
    ? parseISO(String(postedSince).slice(0, 10))
    : undefined;

  const options = useMemo(
    () => outlets.options.filter((option) => option.value !== staff?.branchId),
    [outlets.options, staff?.branchId],
  );

  function handleSubmit(values) {
    setLoading(true);
    const request = ApiService.post(API_LINK.StaffTransfer(staff.id), {
      branchId: values.branchId,
      transferDate: values.transferDate,
      note: values.note,
    });

    notify
      .submit(request, {
        errorText: "Failed to transfer staff",
        onSuccess: () => {
          formik.resetForm();
          onSaved?.();
        },
      })
      .finally(() => setLoading(false));
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
      description={`Move ${fullName(staff)} to another outlet. The current posting is closed on the transfer date.`}
      submitLabel="Transfer"
      submitLoading={loading}
      onSubmit={formik.handleSubmit}
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <div className="transfer-current form-span-2">
          <span className="transfer-current-label">Currently at</span>
          <span className="cell-title">
            {staff?.outlet?.name ?? "No outlet"}
          </span>
          {staff?.outlet?.parent?.name && (
            <span className="cell-sub">{staff.outlet.parent.name}</span>
          )}
          {minDate && (
            <span className="cell-sub">
              Since {format(minDate, "dd MMM yyyy")}
            </span>
          )}
        </div>
        <AutoCompleteField
          label="Transfer To"
          placeholder="Search outlet"
          options={options}
          onSearch={outlets.onSearch}
          loading={outlets.loading}
          filterLocally={false}
          required
          className="form-span-2"
          {...selectProps(formik, "branchId")}
        />
        <CustomDatepicker
          label="Transfer Date"
          required
          className="form-span-2"
          minDate={minDate}
          maxDate={new Date()}
          clearable={false}
          {...dateProps(formik, "transferDate")}
        />
        <CustomTextarea
          label="Note"
          placeholder="Reason for the transfer"
          maxLength={255}
          className="form-span-2"
          {...inputProps(formik, "note")}
        />
      </form>
    </CustomDialog>
  );
}
