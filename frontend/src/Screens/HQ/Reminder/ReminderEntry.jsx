import React, { useMemo, useState } from "react";
import { useFormik } from "formik";
import {
  AutoCompleteField,
  CustomDatepicker,
  CustomDialog,
  CustomSelectField,
  CustomTextarea,
  CustomTimepicker,
  InputField,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { REMINDER_PRIORITY_OPTIONS } from "@/lib/Constant";
import { outletOption, staffOption } from "@/lib/Functions/Common";
import {
  dateProps,
  fieldProps,
  inputProps,
  selectProps,
} from "@/lib/Functions/FormField";
import { ReminderValues } from "@/lib/Schema/FormValues";
import { ReminderValidation } from "@/lib/Schema/FormValidation";
import { fromDueAt, toDueAt } from "./reminderTime";

function toFormValues(reminder) {
  if (!reminder) return ReminderValues;
  return {
    ...ReminderValues,
    title: reminder.title,
    notes: reminder.notes ?? "",
    ...fromDueAt(reminder.dueAt),
    priority: reminder.priority,
    outletId: reminder.outlet?.id ?? "",
    staffId: reminder.staff?.id ?? "",
  };
}

const toPayload = (values) => ({
  title: values.title,
  notes: values.notes,
  dueAt: toDueAt(values.dueDate, values.dueTime),
  priority: values.priority,
  outletId: values.outletId || null,
  staffId: values.staffId || null,
});

export default function ReminderEntry({ open, reminder, onClose, onSaved }) {
  const notify = useNotify();
  const scope = useScope();
  const [saving, setSaving] = useState(false);
  const isEdit = !!reminder?.id;

  const formik = useFormik({
    initialValues: toFormValues(reminder),
    validationSchema: ReminderValidation,
    enableReinitialize: true,
    onSubmit: (values) => {
      setSaving(true);
      const request = isEdit
        ? ApiService.put(
            API_LINK.ReminderDetails(reminder.id),
            toPayload(values),
          )
        : ApiService.post(API_LINK.Reminder, toPayload(values));
      notify
        .submit(request, {
          errorText: "Failed to save the reminder",
          onSuccess: () => {
            formik.resetForm();
            return onSaved?.();
          },
        })
        .finally(() => setSaving(false));
    },
  });

  const outletId = formik.values.outletId;
  const selectedOutlet = useMemo(
    () => outletOption(reminder?.outlet),
    [reminder?.outlet],
  );
  const selectedStaff = useMemo(
    () => staffOption(reminder?.staff),
    [reminder?.staff],
  );

  const outlets = useRemoteOptions({
    url: API_LINK.Outlet,
    params: { companyId: scope.companyId || undefined },
    mapOption: outletOption,
    selected: selectedOutlet,
    enabled: open,
    errorText: "Failed to load outlets",
  });

  const staffs = useRemoteOptions({
    url: API_LINK.Staff,
    params: {
      branchId: outletId || undefined,
      companyId: scope.companyId || undefined,
      status: "ACTIVE",
      sort_by: "firstName",
    },
    mapOption: staffOption,
    selected: selectedStaff,
    enabled: open,
    errorText: "Failed to load staff",
  });

  const handleClose = () => {
    formik.resetForm();
    onClose?.();
  };

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && handleClose()}
      title={isEdit ? "Edit Reminder" : "New Reminder"}
      description="Note something to follow up, with the outlet or staff it is about."
      submitLabel={isEdit ? "Update" : "Create"}
      submitLoading={saving}
      onSubmit={formik.handleSubmit}
    >
      <form onSubmit={formik.handleSubmit} noValidate className="form-grid">
        <InputField
          label="Title"
          placeholder="Check freezer temperature log"
          required
          className="form-span-2"
          {...inputProps(formik, "title")}
        />
        <CustomDatepicker
          label="Due date"
          placeholder="Pick a date"
          required
          {...dateProps(formik, "dueDate")}
        />
        <CustomTimepicker
          label="Time"
          required
          {...fieldProps(formik, "dueTime")}
          onChange={(value) => formik.setFieldValue("dueTime", value ?? "")}
        />
        <AutoCompleteField
          label="Outlet"
          placeholder="Any outlet"
          options={outlets.options}
          onSearch={outlets.onSearch}
          loading={outlets.loading}
          filterLocally={false}
          {...selectProps(formik, "outletId")}
          onValueChange={(value) => {
            formik.setFieldValue("outletId", value ?? "");
            formik.setFieldValue("staffId", "");
          }}
        />
        <AutoCompleteField
          label="Staff"
          placeholder={outletId ? "Anyone at this outlet" : "Anyone"}
          options={staffs.options}
          onSearch={staffs.onSearch}
          loading={staffs.loading}
          filterLocally={false}
          {...selectProps(formik, "staffId")}
          onValueChange={(value) =>
            formik.setFieldValue("staffId", value ?? "")
          }
        />
        <CustomSelectField
          label="Priority"
          options={REMINDER_PRIORITY_OPTIONS}
          required
          {...selectProps(formik, "priority")}
        />
        <CustomTextarea
          label="Notes"
          placeholder="What needs doing, who to call, anything to remember"
          rows={3}
          className="form-span-2"
          {...inputProps(formik, "notes")}
        />
      </form>
    </CustomDialog>
  );
}
