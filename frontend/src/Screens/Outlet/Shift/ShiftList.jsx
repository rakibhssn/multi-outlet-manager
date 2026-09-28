import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useAtom, useAtomValue } from "jotai";
import { LuCoffee, LuLogIn, LuLogOut, LuPlay } from "react-icons/lu";
import {
  AnimateButton,
  CustomTable,
  CustomTooltip,
  StatusComp,
} from "@/components/custom";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import { StackCell } from "@/Screens/Layout/TableCells";
import useCan from "@/hooks/useCan";
import useConfirm from "@/hooks/useConfirm";
import useNotify from "@/hooks/useNotify";
import useScope from "@/hooks/useScope";
import useTableList from "@/hooks/useTableList";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { DESIGNATION_OPTIONS, SHIFT_STATUS_OPTIONS } from "@/lib/Constant";
import {
  formatDate,
  formatDuration,
  formatMinutes,
  formatTime,
  fullName,
  labelOf,
} from "@/lib/Functions/Common";
import { ShiftColumn } from "@/lib/TableData/Columns";
import { shiftRefresh, userData } from "@/lib/Variables";
import ClockInStaff from "./ClockInStaff";
import { breakMinutes, openBreakOf, workedMinutes } from "./shiftTime";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "clockInAt",
  order_by: "desc",
};

function BreakList({ breaks }) {
  if (!breaks?.length) return "—";
  return (
    <div className="break-list">
      {breaks.map((item) => (
        <span
          key={item.id}
          className={item.endAt ? "break-item" : "break-item break-item-open"}
        >
          {formatTime(item.startAt)} –{" "}
          {item.endAt ? formatTime(item.endAt) : "now"} ·{" "}
          {formatDuration(item.startAt, item.endAt)}
        </span>
      ))}
    </div>
  );
}

function ShiftActions({ onBreak, onToggleBreak, onEnd }) {
  const breakLabel = onBreak ? "End break" : "Start break";
  return (
    <div className="shift-actions">
      <CustomTooltip title={breakLabel}>
        <AnimateButton
          size="icon"
          variant="outline"
          preIcon={onBreak ? LuPlay : LuCoffee}
          aria-label={breakLabel}
          onClick={onToggleBreak}
        />
      </CustomTooltip>
      <CustomTooltip title="End shift">
        <AnimateButton
          size="icon"
          variant="outline"
          preIcon={LuLogOut}
          aria-label="End shift"
          onClick={onEnd}
        />
      </CustomTooltip>
    </div>
  );
}

export default function ShiftList() {
  const scope = useScope();
  const notify = useNotify();
  const confirm = useConfirm();
  const { user } = useAtomValue(userData);
  const [version, setVersion] = useAtom(shiftRefresh);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "";
  const can = useCan();
  const canSelf = can("shifts.self");
  const canOthers = can("shifts.manage");
  const [clockInOpen, setClockInOpen] = useState(false);

  const { rows, offset, reload, params, ...table } = useTableList({
    url: API_LINK.Shift,
    defaults: DEFAULT_PARAMS,
    initialParams: {
      branchId: scope.outletId || undefined,
      status: initialStatus || undefined,
    },
    filterParam: "status",
    onFilter: (status) =>
      setSearchParams(status ? { status } : {}, { replace: true }),
    errorText: "Failed to load shifts",
  });

  const seenVersion = useRef(version);
  useEffect(() => {
    if (seenVersion.current === version) return;
    seenVersion.current = version;
    reload();
  }, [version, reload]);

  const shifts = useMemo(() => {
    const refresh = () => {
      confirm.close();
      setVersion((n) => n + 1);
    };

    const endShift = (row) =>
      confirm.ask({
        title: "End Shift",
        body: `End the shift of "${fullName(row.staff)}"? They have been on shift for ${formatDuration(row.clockInAt)}.`,
        label: "End Shift",
        onConfirm: () =>
          notify.submit(
            ApiService.post(API_LINK.ShiftEnd, { staffId: row.staffId }),
            {
              errorText: "Failed to end the shift",
              onSuccess: refresh,
            },
          ),
      });

    const toggleBreak = (row, onBreak) =>
      notify.submit(
        ApiService.post(
          onBreak ? API_LINK.ShiftBreakEnd : API_LINK.ShiftBreakStart,
          {
            staffId: row.staffId,
          },
        ),
        { errorText: "Failed to update the break", onSuccess: refresh },
      );

    return rows.map((row, index) => {
      const open = row.status === "ON_SHIFT";
      const onBreak = !!openBreakOf(row);
      const own = !!user?.staffId && row.staffId === user.staffId;
      const canManage = open && (own ? canSelf : canOthers);
      const breakTotal = breakMinutes(row);
      return {
        key: row.id,
        id: 1 + index + offset,
        staff: (
          <StackCell
            title={fullName(row.staff)}
            subtitle={`Badge ${row.staff?.badgeNumber} · ${labelOf(DESIGNATION_OPTIONS, row.staff?.designation)}`}
          />
        ),
        shift: (
          <StackCell
            title={formatDate(row.clockInAt)}
            subtitle={`${formatTime(row.clockInAt)} – ${open ? "now" : formatTime(row.clockOutAt)}`}
          />
        ),
        breaks: <BreakList breaks={row.breaks} />,
        duration: (
          <StackCell
            title={formatMinutes(workedMinutes(row))}
            subtitle={breakTotal ? `${formatMinutes(breakTotal)} break` : null}
          />
        ),
        by: (
          <StackCell
            title={row.startedBy?.email ?? "—"}
            subtitle={row.endedBy ? `Ended by ${row.endedBy.email}` : row.note}
          />
        ),
        status: onBreak ? (
          <StatusComp type="ON_BREAK" label="On Break" tone="warning" />
        ) : (
          <StatusComp type={row.status} tone={open ? undefined : "muted"} />
        ),
        action: canManage ? (
          <ShiftActions
            onBreak={onBreak}
            onToggleBreak={() => toggleBreak(row, onBreak)}
            onEnd={() => endShift(row)}
          />
        ) : null,
      };
    });
  }, [
    rows,
    offset,
    canSelf,
    canOthers,
    user?.staffId,
    notify,
    confirm,
    setVersion,
  ]);

  return (
    <div className="page">
      <PageHeader
        title="Shifts"
        subtitle={`Staff clock-ins and shift history at ${scope.outletName ?? "this outlet"}`}
        actions={
          canOthers && (
            <AnimateButton
              preIcon={LuLogIn}
              label="Clock In Staff"
              onClick={() => setClockInOpen(true)}
            />
          )
        }
      />

      <CustomTable
        columns={ShiftColumn}
        dataSource={shifts}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        onSearch={table.onSearch}
        filterOptions={SHIFT_STATUS_OPTIONS}
        filterPlaceholder="All shifts"
        defaultFilter={initialStatus || "all"}
        reloadAction={reload}
        showReload={true}
        searchPlaceholder="Search staff name or badge..."
        emptyText={
          params.status === "ON_SHIFT"
            ? "Nobody is on shift right now"
            : "No shift has been recorded yet"
        }
      />

      <ClockInStaff
        open={clockInOpen}
        outletId={scope.outletId}
        onClose={() => setClockInOpen(false)}
        onSaved={() => {
          setClockInOpen(false);
          setVersion((n) => n + 1);
        }}
      />
    </div>
  );
}
