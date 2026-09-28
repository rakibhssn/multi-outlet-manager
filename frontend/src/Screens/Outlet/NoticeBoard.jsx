import React, { useState } from "react";
import {
  LuCircleCheck,
  LuMegaphone,
  LuReply,
  LuUserRound,
} from "react-icons/lu";
import { AnimateButton, StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import { dueLabel } from "@/Screens/HQ/Reminder/reminderTime";
import ReminderThread from "@/Screens/HQ/Reminder/ReminderThread";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { fullName } from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";
import NoticeReply from "./NoticeReply";

const REFRESH_INTERVAL = 60000;
const PRIORITY_TONE = { HIGH: "danger", LOW: "muted" };

function boardTitle(data) {
  if (!data?.total) return "Notice Board";
  const overdue = data.overdue ? ` · ${data.overdue} overdue` : "";
  return `Notice Board · ${data.total} open${overdue}`;
}

function NoticeRow({ notice, canReply, onReply }) {
  const due = dueLabel(notice);
  return (
    <li className="reminder-row">
      <span
        className={cn(
          "activity-icon",
          `status-${due.tone === "danger" ? "danger" : "info"}`,
        )}
      >
        <LuMegaphone />
      </span>
      <div className="reminder-body">
        <span className="reminder-title">{notice.title}</span>
        {notice.notes && <p className="reminder-notes">{notice.notes}</p>}
        <div className="reminder-meta">
          <span className={cn("reminder-due", `reminder-due-${due.tone}`)}>
            {due.text}
          </span>
          {notice.priority !== "NORMAL" && (
            <StatusComp
              type={notice.priority}
              label={notice.priority === "HIGH" ? "High" : "Low"}
              tone={PRIORITY_TONE[notice.priority]}
            />
          )}
          {notice.staff && (
            <span className="reminder-chip">
              <LuUserRound />
              {fullName(notice.staff)}
            </span>
          )}
        </div>
        <ReminderThread reminder={notice} />
        {canReply && (
          <div className="notice-actions">
            {!notice.acceptedAt && (
              <AnimateButton
                size="sm"
                preIcon={LuCircleCheck}
                label="Accept"
                onClick={() => onReply(notice, "accept")}
              />
            )}
            <AnimateButton
              size="sm"
              variant="outline"
              preIcon={LuReply}
              label="Reply"
              onClick={() => onReply(notice, "reply")}
            />
          </div>
        )}
      </div>
    </li>
  );
}

export default function NoticeBoard({ outletId }) {
  const notify = useNotify();
  const can = useCan();
  const [data, setData] = useState(null);
  const [target, setTarget] = useState(null);
  const [version, setVersion] = useState(0);

  usePolling(
    () => {
      notify.load(
        ApiService.get(API_LINK.OutletNotices, {
          params: { branchId: outletId || undefined },
        }),
        {
          errorText: "Failed to load the notice board",
          onSuccess: (res) =>
            setData({
              rows: res.data ?? [],
              total: res.total,
              overdue: res.overdue,
            }),
        },
      );
    },
    REFRESH_INTERVAL,
    `${outletId}-${version}`,
  );

  return (
    <ViewBox title={boardTitle(data)}>
      {data === null && <Skeleton className="h-48 rounded-md" />}
      {data?.rows.length === 0 && (
        <p className="dashboard-empty">No notices from headquarters.</p>
      )}
      {data?.rows.length > 0 && (
        <ul className="reminder-list">
          {data.rows.map((notice) => (
            <NoticeRow
              key={notice.id}
              notice={notice}
              canReply={can("reminders.reply")}
              onReply={(item, mode) => setTarget({ notice: item, mode })}
            />
          ))}
        </ul>
      )}
      <NoticeReply
        target={target}
        onClose={() => setTarget(null)}
        onSaved={() => {
          setTarget(null);
          setVersion((n) => n + 1);
        }}
      />
    </ViewBox>
  );
}
