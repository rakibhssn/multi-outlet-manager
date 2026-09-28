import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import {
  AnimateButton,
  CustomDatepicker,
  CustomDialog,
  CustomTextarea,
  CustomTimepicker,
} from "@/components/custom";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { fullName } from "@/lib/Functions/Common";
import { atTime, toClock } from "./shiftTime";

const toForm = (shift) => ({
  date: shift ? format(new Date(shift.clockInAt), "yyyy-MM-dd") : "",
  clockIn: toClock(shift?.clockInAt),
  clockOut: toClock(shift?.clockOutAt),
  note: shift?.note ?? "",
  breaks: (shift?.breaks ?? []).map((item) => ({
    id: item.id,
    start: toClock(item.startAt),
    end: toClock(item.endAt),
  })),
});

function toPayload(form) {
  const clockInAt = atTime(form.date, form.clockIn);
  const clockOutAt = atTime(form.date, form.clockOut, clockInAt);
  const breaks = form.breaks.map((item) => {
    const startAt = atTime(form.date, item.start);
    const start =
      startAt && clockInAt && startAt < clockInAt
        ? atTime(form.date, item.start, clockInAt)
        : startAt;
    return {
      id: item.id,
      startAt: start?.toISOString() ?? null,
      endAt:
        atTime(
          format(start ?? new Date(), "yyyy-MM-dd"),
          item.end,
          start,
        )?.toISOString() ?? null,
    };
  });
  return {
    clockInAt: clockInAt?.toISOString() ?? null,
    clockOutAt: clockOutAt?.toISOString() ?? null,
    note: form.note,
    breaks,
  };
}

export default function ShiftEntry({ shift, onClose, onSaved }) {
  const notify = useNotify();
  const [form, setForm] = useState(() => toForm(shift));
  const [saving, setSaving] = useState(false);
  const open = shift?.status === "ON_SHIFT";

  useEffect(() => setForm(toForm(shift)), [shift]);

  const set = (key) => (value) =>
    setForm((current) => ({ ...current, [key]: value ?? "" }));

  const setBreak = (index, key) => (value) =>
    setForm((current) => ({
      ...current,
      breaks: current.breaks.map((item, i) =>
        i === index ? { ...item, [key]: value ?? "" } : item,
      ),
    }));

  const addBreak = () =>
    setForm((current) => ({
      ...current,
      breaks: [...current.breaks, { id: null, start: "", end: "" }],
    }));

  const removeBreak = (index) =>
    setForm((current) => ({
      ...current,
      breaks: current.breaks.filter((_, i) => i !== index),
    }));

  const incomplete =
    !form.date ||
    !form.clockIn ||
    (!open && !form.clockOut) ||
    form.breaks.some((item) => !item.start);

  function handleSubmit() {
    setSaving(true);
    notify
      .submit(
        ApiService.put(API_LINK.ShiftDetails(shift.id), toPayload(form)),
        {
          errorText: "Failed to update the shift",
          onSuccess: () => onSaved?.(),
        },
      )
      .finally(() => setSaving(false));
  }

  return (
    <CustomDialog
      open={!!shift}
      openChange={(next) => !next && onClose?.()}
      title="Edit Shift"
      description={
        shift
          ? `Correct the clock times and breaks of ${fullName(shift.staff)}. A time earlier than clock in counts as the next day.`
          : ""
      }
      submitLabel="Update"
      submitLoading={saving}
      submitDisabled={incomplete}
      onSubmit={handleSubmit}
    >
      <div className="form-grid">
        <CustomDatepicker
          label="Shift date"
          required
          className="form-span-2"
          maxDate={new Date()}
          clearable={false}
          value={form.date}
          onChange={(date) =>
            set("date")(date ? format(date, "yyyy-MM-dd") : "")
          }
        />
        <CustomTimepicker
          label="Clock in"
          required
          minuteStep={1}
          clearable={false}
          value={form.clockIn}
          onChange={set("clockIn")}
        />
        <CustomTimepicker
          label="Clock out"
          required={!open}
          minuteStep={1}
          clearable={open}
          placeholder={open ? "Still on shift" : "Pick a time"}
          hint={open ? "Set a time to end the shift" : undefined}
          value={form.clockOut}
          onChange={set("clockOut")}
        />

        <div className="shift-break-editor form-span-2">
          <div className="shift-break-head">
            <span className="shift-break-title">Breaks</span>
            <AnimateButton
              size="sm"
              variant="outline"
              preIcon={LuPlus}
              label="Add break"
              onClick={addBreak}
            />
          </div>
          {form.breaks.length === 0 && (
            <p className="shift-break-empty">No breaks on this shift.</p>
          )}
          {form.breaks.map((item, index) => (
            <div key={item.id ?? `new-${index}`} className="shift-break-row">
              <CustomTimepicker
                label={`Break ${index + 1} start`}
                required
                minuteStep={1}
                clearable={false}
                value={item.start}
                onChange={setBreak(index, "start")}
              />
              <CustomTimepicker
                label="End"
                minuteStep={1}
                placeholder="On break"
                value={item.end}
                onChange={setBreak(index, "end")}
              />
              <AnimateButton
                size="icon"
                variant="outline"
                preIcon={LuTrash2}
                aria-label={`Remove break ${index + 1}`}
                className="shift-break-remove"
                onClick={() => removeBreak(index)}
              />
            </div>
          ))}
        </div>

        <CustomTextarea
          label="Note"
          placeholder="Optional"
          rows={2}
          maxLength={255}
          className="form-span-2"
          value={form.note}
          onChange={(e) => set("note")(e.target.value)}
        />
      </div>
    </CustomDialog>
  );
}
