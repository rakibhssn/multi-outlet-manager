import React, { useState } from "react";
import {
  AutoCompleteField,
  CustomDialog,
  CustomTextarea,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { staffOption } from "@/lib/Functions/Common";

export default function ClockInStaff({ open, outletId, onClose, onSaved }) {
  const notify = useNotify();
  const [staffId, setStaffId] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const staffs = useRemoteOptions({
    url: API_LINK.Staff,
    params: { branchId: outletId, status: "ACTIVE", sort_by: "firstName" },
    mapOption: staffOption,
    enabled: open && !!outletId,
    errorText: "Failed to load staff",
  });

  const close = () => {
    setStaffId(null);
    setNote("");
    onClose?.();
  };

  function handleSubmit() {
    setLoading(true);
    notify
      .submit(ApiService.post(API_LINK.ShiftStart, { staffId, note }), {
        errorText: "Failed to start the shift",
        onSuccess: () => {
          setStaffId(null);
          setNote("");
          onSaved?.();
        },
      })
      .finally(() => setLoading(false));
  }

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && close()}
      title="Clock In Staff"
      description="Start a shift for a staff member who is working now."
      submitLabel="Start Shift"
      submitLoading={loading}
      submitDisabled={!staffId}
      onSubmit={handleSubmit}
    >
      <div className="form-grid">
        <AutoCompleteField
          label="Staff"
          placeholder="Search staff"
          required
          className="form-span-2"
          options={staffs.options}
          onSearch={staffs.onSearch}
          loading={staffs.loading}
          filterLocally={false}
          value={staffId}
          onValueChange={(value) => setStaffId(value ?? null)}
          emptyMessage="No active staff found"
        />
        <CustomTextarea
          label="Note"
          placeholder="Optional"
          rows={2}
          maxLength={255}
          className="form-span-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </CustomDialog>
  );
}
