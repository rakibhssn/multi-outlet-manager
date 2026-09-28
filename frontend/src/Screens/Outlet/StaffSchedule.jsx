import React, { useState } from "react";
import { Link } from "react-router";
import { StatusComp } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewBox } from "@/Screens/Layout/DashboardBlocks";
import { StackCell } from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { DESIGNATION_OPTIONS } from "@/lib/Constant";
import {
  formatMinutes,
  formatTime,
  fullName,
  labelOf,
} from "@/lib/Functions/Common";
import { openBreakOf, workedMinutes } from "./Shift/shiftTime";

const REFRESH_INTERVAL = 60000;

const STATES = {
  ON_SHIFT: { label: "On Shift", tone: "success" },
  ON_BREAK: { label: "On Break", tone: "warning" },
  DONE: { label: "Done", tone: "muted" },
  NOT_IN: { label: "Not In", tone: "muted" },
};

function timeText({ state, shift }) {
  if (state === "NOT_IN") return "Not clocked in today";
  const worked = formatMinutes(workedMinutes(shift));
  if (state === "DONE") {
    return `${formatTime(shift.clockInAt)} – ${formatTime(shift.clockOutAt)} · ${worked}`;
  }
  if (state === "ON_BREAK") {
    return `Since ${formatTime(shift.clockInAt)} · break from ${formatTime(openBreakOf(shift).startAt)}`;
  }
  return `Since ${formatTime(shift.clockInAt)} · ${worked}`;
}

function scheduleTitle(summary) {
  if (!summary) return "Staff Schedule";
  const working = summary.ON_SHIFT + summary.ON_BREAK;
  return `Staff Schedule · ${working} working`;
}

export default function StaffSchedule({ outletId, refreshKey }) {
  const notify = useNotify();
  const can = useCan();
  const [data, setData] = useState(null);

  usePolling(
    () => {
      notify.load(
        ApiService.get(API_LINK.OutletStaffSchedule, {
          params: { branchId: outletId || undefined },
        }),
        {
          errorText: "Failed to load the staff schedule",
          onSuccess: (res) =>
            setData({ rows: res.data ?? [], summary: res.summary }),
        },
      );
    },
    REFRESH_INTERVAL,
    `${outletId}-${refreshKey}`,
  );

  return (
    <ViewBox
      title={scheduleTitle(data?.summary)}
      actions={
        can("shifts.view") && (
          <Link to="/outlet/shift" className="view-box-link">
            View shifts
          </Link>
        )
      }
    >
      {data === null && <Skeleton className="h-48 rounded-md" />}
      {data?.rows.length === 0 && (
        <p className="dashboard-empty">No active staff at this outlet.</p>
      )}
      {data?.rows.length > 0 && (
        <ul className="schedule-list">
          {data.rows.map((row) => {
            const state = STATES[row.state];
            return (
              <li key={row.staff.id} className="schedule-row">
                <StackCell
                  title={fullName(row.staff)}
                  subtitle={`${labelOf(DESIGNATION_OPTIONS, row.staff.designation)} · ${timeText(row)}`}
                />
                <StatusComp
                  type={row.state}
                  label={state.label}
                  tone={state.tone}
                />
              </li>
            );
          })}
        </ul>
      )}
    </ViewBox>
  );
}
