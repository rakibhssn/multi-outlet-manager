import { format, isPast, isToday, isTomorrow } from "date-fns";

export function dueLabel(reminder) {
  const due = new Date(reminder.dueAt);
  const time = format(due, "hh:mm a");
  if (reminder.status === "DONE") {
    return {
      text: `Done ${format(new Date(reminder.completedAt ?? due), "dd MMM")}`,
      tone: "muted",
    };
  }
  if (isPast(due))
    return {
      text: `Overdue · ${format(due, "dd MMM")}, ${time}`,
      tone: "danger",
    };
  if (isToday(due)) return { text: `Today, ${time}`, tone: "warning" };
  if (isTomorrow(due)) return { text: `Tomorrow, ${time}`, tone: "info" };
  return { text: format(due, "EEE, dd MMM · hh:mm a"), tone: "muted" };
}

export const toDueAt = (date, time) =>
  new Date(`${date}T${time}`).toISOString();

export function fromDueAt(value) {
  if (!value) return { dueDate: "", dueTime: "09:00" };
  const due = new Date(value);
  return { dueDate: format(due, "yyyy-MM-dd"), dueTime: format(due, "HH:mm") };
}
