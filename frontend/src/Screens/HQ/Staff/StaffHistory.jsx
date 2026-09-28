import React, { useMemo } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CustomDialog, CustomTable } from "@/components/custom";
import { StackCell } from "@/Screens/Layout/TableCells";
import useTableList from "@/hooks/useTableList";
import { API_LINK } from "@/lib/API_LINK";
import { fullName, plural } from "@/lib/Functions/Common";
import { StaffAssignmentColumn } from "@/lib/TableData/Columns";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "startDate",
  order_by: "desc",
};

const toDay = (value) => parseISO(String(value).slice(0, 10));

const durationOf = (start, end) => {
  const days = differenceInCalendarDays(
    end ? toDay(end) : new Date(),
    toDay(start),
  );
  if (days < 1) return "Less than a day";
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const rest = days - years * 365 - months * 30;
  return [
    years && `${years} yr`,
    months && `${months} mo`,
    !years && rest && plural(rest, "day"),
  ]
    .filter(Boolean)
    .join(" ");
};

export default function StaffHistory({ open, staff, onClose }) {
  const { rows, offset, reload, reset, params, ...table } = useTableList({
    url: staff?.id ? API_LINK.StaffAssignments(staff.id) : null,
    defaults: DEFAULT_PARAMS,
    enabled: open,
    errorText: "Failed to load work history",
  });

  const postings = useMemo(
    () =>
      rows.map((row, index) => ({
        key: row.id,
        id: 1 + index + offset,
        outlet: (
          <StackCell
            title={row.outlet?.name}
            subtitle={row.outlet?.parent?.name}
          />
        ),
        startDate: format(toDay(row.startDate), "dd MMM yyyy"),
        endDate: row.endDate ? (
          format(toDay(row.endDate), "dd MMM yyyy")
        ) : (
          <span className="posting-current">Present</span>
        ),
        duration: durationOf(row.startDate, row.endDate),
        note: row.note ? <span className="cell-sub">{row.note}</span> : "—",
      })),
    [rows, offset],
  );

  return (
    <CustomDialog
      open={open}
      openChange={(next) => {
        if (!next) {
          reset();
          onClose?.();
        }
      }}
      title={staff ? `${fullName(staff)} · Work History` : "Work History"}
      description={`Worked at ${plural(staff?.outletsWorked ?? 0, "outlet")} across ${plural(table.total, "posting")}.`}
      footer={false}
      className="item-outlets-dialog"
    >
      <CustomTable
        columns={StaffAssignmentColumn}
        dataSource={postings}
        rowKey="key"
        loading={table.loading}
        total={table.total}
        pageSize={params.per_page}
        onChange={table.onChange}
        showSearch={false}
        reloadAction={reload}
        showReload={true}
        emptyText="No posting has been recorded yet"
        className="table-card-plain"
      />
    </CustomDialog>
  );
}
