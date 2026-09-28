import React, { useCallback, useEffect, useState } from "react";
import { LuPlus, LuStore, LuUserRound } from "react-icons/lu";
import { ActionComp, CustomCheckbox, StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { fullName } from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";
import ReminderEntry from "./ReminderEntry";
import ReminderThread from "./ReminderThread";
import { dueLabel } from "./reminderTime";

const FILTERS = [
  { value: "OPEN", label: "Open", count: (summary) => summary?.open },
  { value: "DONE", label: "Done", count: (summary) => summary?.done },
];

const PRIORITY_TONE = { HIGH: "danger", LOW: "muted" };

function ReminderRow({ reminder, can, onToggle, onEdit, onDelete }) {
  const due = dueLabel(reminder);
  const done = reminder.status === "DONE";

  return (
    <li className={cn("reminder-row", done && "reminder-row-done")}>
      <CustomCheckbox
        name={`reminder-${reminder.id}`}
        checked={done}
        disabled={!can("reminders.edit")}
        onChange={(on) => onToggle(reminder, on)}
        className="reminder-check"
      />
      <div className="reminder-body">
        <span className="reminder-title">{reminder.title}</span>
        {reminder.notes && <p className="reminder-notes">{reminder.notes}</p>}
        <div className="reminder-meta">
          <span className={cn("reminder-due", `reminder-due-${due.tone}`)}>
            {due.text}
          </span>
          {reminder.priority !== "NORMAL" && (
            <StatusComp
              type={reminder.priority}
              label={reminder.priority === "HIGH" ? "High" : "Low"}
              tone={PRIORITY_TONE[reminder.priority]}
            />
          )}
          {reminder.outlet && (
            <span className="reminder-chip">
              <LuStore />
              {reminder.outlet.name}
            </span>
          )}
          {reminder.staff && (
            <span className="reminder-chip">
              <LuUserRound />
              {fullName(reminder.staff)}
            </span>
          )}
        </div>
        <ReminderThread reminder={reminder} />
      </div>
      <ActionComp
        className="reminder-actions"
        edit={can("reminders.edit")}
        editTitle="Edit reminder"
        editAction={() => onEdit(reminder)}
        remove={can("reminders.delete")}
        deleteTitle="Delete reminder"
        deleteAction={() => onDelete(reminder)}
      />
    </li>
  );
}

export default function Reminders() {
  const notify = useNotify();
  const confirm = useConfirm();
  const can = useCan();
  const [status, setStatus] = useState("OPEN");
  const [data, setData] = useState(null);
  const [entry, setEntry] = useState(null);

  const load = useCallback(
    () =>
      notify.load(
        ApiService.get(API_LINK.Reminder, { params: { status, per_page: 50 } }),
        {
          errorText: "Failed to load reminders",
          onSuccess: (res) =>
            setData({ rows: res.data ?? [], summary: res.summary }),
        },
      ),
    [status, notify],
  );

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (reminder, done) =>
    notify.submit(
      ApiService.patch(API_LINK.ReminderDone(reminder.id), { done }),
      { errorText: "Failed to update the reminder", onSuccess: load },
    );

  const remove = (reminder) =>
    confirm.remove({
      title: "Delete Reminder",
      body: `Delete "${reminder.title}"?`,
      onConfirm: () =>
        notify.submit(
          ApiService.delete(API_LINK.ReminderDetails(reminder.id)),
          {
            errorText: "Failed to delete the reminder",
            onSuccess: () => {
              confirm.close();
              return load();
            },
          },
        ),
    });

  const overdue = data?.summary?.overdue ?? 0;

  return (
    <ViewBox
      title={overdue ? `Reminders · ${overdue} overdue` : "Reminders"}
      className="reminders-box"
      actions={
        can("reminders.create") && (
          <button
            type="button"
            className="view-box-link reminder-add"
            onClick={() => setEntry({})}
          >
            <LuPlus />
            New
          </button>
        )
      }
    >
      <div className="reminder-filters" role="tablist">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={status === filter.value}
            className={cn(
              "reminder-filter",
              status === filter.value && "reminder-filter-active",
            )}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
            <span className="reminder-count">
              {filter.count(data?.summary) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {!data && <Skeleton className="h-56 rounded-md" />}
      {data?.rows.length === 0 && (
        <p className="dashboard-empty">
          {status === "OPEN"
            ? "Nothing to follow up. Add a reminder to keep track."
            : "No reminder has been marked done yet."}
        </p>
      )}
      {data?.rows.length > 0 && (
        <ul className="reminder-list">
          {data.rows.map((reminder) => (
            <ReminderRow
              key={reminder.id}
              reminder={reminder}
              can={can}
              onToggle={toggle}
              onEdit={setEntry}
              onDelete={remove}
            />
          ))}
        </ul>
      )}

      <ReminderEntry
        open={!!entry}
        reminder={entry?.id ? entry : null}
        onClose={() => setEntry(null)}
        onSaved={() => {
          setEntry(null);
          return load();
        }}
      />
    </ViewBox>
  );
}
