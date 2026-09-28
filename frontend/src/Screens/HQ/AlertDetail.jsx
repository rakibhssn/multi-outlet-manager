import React, { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { LuStore, LuUserRound } from "react-icons/lu";
import { CustomDialog, StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { StackCell, StockCell, ThumbCell } from "@/Screens/Layout/TableCells";
import { dueLabel } from "@/Screens/HQ/Reminder/reminderTime";
import ReminderThread from "@/Screens/HQ/Reminder/ReminderThread";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { DESIGNATION_OPTIONS } from "@/lib/Constant";
import {
  formatDateTime,
  formatDuration,
  formatMoney,
  fullName,
  humanize,
  labelOf,
  plural,
} from "@/lib/Functions/Common";
import { orderTypeText } from "@/lib/Functions/Order";
import { cn } from "@/lib/utils";

const ago = (value) =>
  formatDistanceToNowStrict(new Date(value), { addSuffix: true });

const staffLine = (staff) =>
  [
    staff?.badgeNumber && `Badge ${staff.badgeNumber}`,
    labelOf(DESIGNATION_OPTIONS, staff?.designation),
  ]
    .filter(Boolean)
    .join(" · ");

const GUIDES = {
  STOCK_CRITICAL: {
    why: "These items have 3 or fewer left at this outlet, and some may already be out. An item cannot be sold once it reaches 0.",
    todo: "Restock the outlet or mark the items unavailable so staff stop offering them.",
  },
  STOCK_LOW: {
    why: "These items have 10 or fewer left at this outlet.",
    todo: "Plan a restock before they become critical.",
  },
  ORDER_LATE: {
    why: "These orders were confirmed more than 30 minutes ago and are still not completed.",
    todo: "Ask the outlet whether the customer was served, then complete or cancel the order. Open an order to see its items.",
  },
  ORDER_CANCELLED: {
    why: "These orders were cancelled today. Their stock went back to the outlet.",
    todo: "A few cancellations are normal. If they keep rising, ask the outlet why.",
  },
  SHIFT_LONG: {
    why: "These shifts have been open for more than 12 hours, which usually means someone forgot to clock out.",
    todo: "Ask the outlet admin or manager to end or correct the shift on the Shifts page.",
  },
  BREAK_LONG: {
    why: "These breaks started more than an hour ago and have not ended.",
    todo: "Check with the outlet; the staff member may have forgotten to end the break.",
  },
  REMINDER_OVERDUE: {
    why: "The due time has passed and the reminder is still open.",
    todo: "If nobody accepted it, contact the outlet. If it was accepted, follow up or mark it done once finished.",
  },
  REMINDER_ACCEPTED: {
    why: "The outlet accepted this reminder in the last 24 hours.",
    todo: "Nothing is needed now. Mark it done when the outlet finishes the task.",
  },
  REMINDER_REPLY: {
    why: "The outlet replied to this reminder in the last 24 hours.",
    todo: "Read the reply and answer the outlet if they need something from you.",
  },
  NO_SALES: {
    why: "The outlet is active but has no confirmed or completed sales today. This alert shows after noon.",
    todo: "Check whether the outlet is open, has staff on shift and has items in stock.",
  },
};

function Rows({ rows, empty, children }) {
  if (!rows?.length) return <p className="dashboard-empty">{empty}</p>;
  return <ul className="alert-rows">{rows.map(children)}</ul>;
}

function StockRows({ rows }) {
  return (
    <Rows rows={rows} empty="Every item is back in stock.">
      {(item) => (
        <li key={item.id} className="alert-row">
          <ThumbCell
            image={item.image}
            title={item.name}
            subtitle={item.menu}
          />
          <span className="alert-row-side">
            <StockCell stock={item.stock} />
            <span className="cell-sub">{formatMoney(item.price)}</span>
          </span>
          <StatusComp type={item.level} />
        </li>
      )}
    </Rows>
  );
}

function OrderRows({ rows, cancelled, onOpenOrder }) {
  return (
    <Rows rows={rows} empty="No matching orders any more.">
      {(order) => (
        <li key={order.id}>
          <button
            type="button"
            className="alert-row alert-row-action"
            onClick={() => onOpenOrder(order.id)}
          >
            <StackCell
              title={order.orderNumber}
              subtitle={`${orderTypeText(order.orderType, order.tableNumber)} · ${fullName(order.server) || "—"}`}
            />
            <span className="alert-row-side">
              <span className="cell-title">
                {formatMoney(order.totalAmount)}
              </span>
              <span className="cell-sub">
                {plural(order.totalItems, "item")}
              </span>
            </span>
            <span className="alert-row-side">
              <span className="cell-sub">
                {cancelled
                  ? `Cancelled ${ago(order.cancelledAt)}`
                  : `Waiting ${formatDuration(order.confirmedAt)}`}
              </span>
              <span className="cell-sub">
                Placed {formatDateTime(order.confirmedAt)}
              </span>
            </span>
          </button>
        </li>
      )}
    </Rows>
  );
}

function ShiftRows({ rows }) {
  return (
    <Rows rows={rows} empty="These shifts have ended.">
      {(shift) => (
        <li key={shift.id} className="alert-row">
          <StackCell
            title={fullName(shift.staff)}
            subtitle={staffLine(shift.staff)}
          />
          <span className="alert-row-side">
            <span className="cell-title">
              {formatDuration(shift.clockInAt)}
            </span>
            <span className="cell-sub">
              Since {formatDateTime(shift.clockInAt)}
            </span>
          </span>
          <span className="cell-sub">
            {shift.startedBy?.email
              ? `Started by ${shift.startedBy.email}`
              : ""}
          </span>
        </li>
      )}
    </Rows>
  );
}

function BreakRows({ rows }) {
  return (
    <Rows rows={rows} empty="These breaks have ended.">
      {(item) => (
        <li key={item.id} className="alert-row">
          <StackCell
            title={fullName(item.shift.staff)}
            subtitle={staffLine(item.shift.staff)}
          />
          <span className="alert-row-side">
            <span className="cell-title">{formatDuration(item.startAt)}</span>
            <span className="cell-sub">
              Break since {formatDateTime(item.startAt)}
            </span>
          </span>
          <span className="cell-sub">
            Shift since {formatDateTime(item.shift.clockInAt)}
          </span>
        </li>
      )}
    </Rows>
  );
}

function ReminderInfo({ reminder }) {
  const due = dueLabel(reminder);
  return (
    <div className="alert-reminder">
      <span className="reminder-title">{reminder.title}</span>
      {reminder.notes && (
        <p className="alert-reminder-notes">{reminder.notes}</p>
      )}
      <div className="reminder-meta">
        <span className={cn("reminder-due", `reminder-due-${due.tone}`)}>
          {due.text}
        </span>
        {reminder.priority !== "NORMAL" && (
          <StatusComp
            type={reminder.priority}
            label={humanize(reminder.priority)}
            tone={reminder.priority === "HIGH" ? "danger" : "muted"}
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
      <span className="cell-sub">
        Created {formatDateTime(reminder.createdAt)}
        {reminder.createdBy?.email ? ` by ${reminder.createdBy.email}` : ""}
      </span>
      <ReminderThread reminder={reminder} />
      {!reminder.acceptedAt && !reminder.replies?.length && (
        <p className="cell-sub">The outlet has not accepted or replied yet.</p>
      )}
    </div>
  );
}

function OutletStatus({ data, outlet }) {
  const today = data.ordersToday ?? {};
  const items = [
    {
      label: "Last sale",
      value: data.lastSale
        ? `${data.lastSale.orderNumber} · ${formatMoney(data.lastSale.totalAmount)} · ${ago(data.lastSale.confirmedAt)}`
        : "Never",
    },
    {
      label: "Orders today",
      value: Object.keys(today).length
        ? Object.entries(today)
            .map(
              ([status, count]) => `${count} ${humanize(status).toLowerCase()}`,
            )
            .join(", ")
        : "None",
    },
    {
      label: "Staff on shift",
      value: data.onShift.length
        ? data.onShift
            .map(
              (shift) =>
                `${fullName(shift.staff)} (since ${formatDateTime(shift.clockInAt)})`,
            )
            .join(", ")
        : "Nobody is clocked in",
    },
    {
      label: "Items in stock",
      value: `${data.stock.stocked} in stock · ${data.stock.outOfStock} out of stock`,
    },
    {
      label: "Contact",
      value: [outlet?.contactPersonName, outlet?.contactPersonPhone]
        .filter(Boolean)
        .join(" · "),
    },
  ];
  return (
    <dl className="detail-list">
      {items.map((item) => (
        <div key={item.label} className="detail-item">
          <dt className="detail-label">{item.label}</dt>
          <dd className="detail-value">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function DetailBody({ detail, onOpenOrder }) {
  const { type, data, outlet } = detail;
  if (type.startsWith("STOCK_")) return <StockRows rows={data} />;
  if (type === "ORDER_LATE")
    return <OrderRows rows={data} onOpenOrder={onOpenOrder} />;
  if (type === "ORDER_CANCELLED")
    return <OrderRows rows={data} cancelled onOpenOrder={onOpenOrder} />;
  if (type === "SHIFT_LONG") return <ShiftRows rows={data} />;
  if (type === "BREAK_LONG") return <BreakRows rows={data} />;
  if (type === "NO_SALES") return <OutletStatus data={data} outlet={outlet} />;
  return <ReminderInfo reminder={data} />;
}

export default function AlertDetail({ alert, open, onClose, onOpenOrder }) {
  const notify = useNotify();
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!alert) return;
    setDetail(null);
    notify.load(
      ApiService.get(API_LINK.CompanyAlertDetail(alert.type), {
        params: { outletId: alert.outlet?.id, ref: alert.ref },
      }),
      {
        errorText: "Failed to load the alert details",
        onSuccess: (res) => setDetail(res.data),
      },
    );
  }, [alert, notify]);

  const guide = GUIDES[alert?.type];

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title={alert?.title ?? "Alert"}
      description={[alert?.outlet?.name, alert?.detail]
        .filter(Boolean)
        .join(" · ")}
      footer={false}
      className="alert-dialog"
    >
      <div className="alert-detail">
        {guide && (
          <div className={cn("alert-guide", `alert-guide-${alert.severity}`)}>
            <p>
              <strong>Why: </strong>
              {guide.why}
            </p>
            <p>
              <strong>What to do: </strong>
              {guide.todo}
            </p>
          </div>
        )}
        {!detail && <Skeleton className="h-48 rounded-md" />}
        {detail && <DetailBody detail={detail} onOpenOrder={onOpenOrder} />}
      </div>
    </CustomDialog>
  );
}
