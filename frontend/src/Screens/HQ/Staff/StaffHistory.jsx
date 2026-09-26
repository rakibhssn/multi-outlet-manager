import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CustomDialog, CustomTable } from "@/components/custom";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { StaffAssignmentColumn } from "@/lib/TableData/Columns";
import { notificationModal } from "@/lib/Variables";

const DEFAULT_PARAMS = {
  page: 1,
  per_page: 10,
  sort_by: "startDate",
  order_by: "desc",
};

const toDay = (value) => parseISO(String(value).slice(0, 10));

const durationOf = (start, end) => {
  const days = differenceInCalendarDays(end ? toDay(end) : new Date(), toDay(start));
  if (days < 1) return "Less than a day";
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const rest = days - years * 365 - months * 30;
  return [
    years && `${years} yr`,
    months && `${months} mo`,
    !years && rest && `${rest} day${rest > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(" ");
};

export default function StaffHistory({ open, staff, onClose }) {
  const [, setNotification] = useAtom(notificationModal);
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [data, setData] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(() => {
    if (!open || !staff?.id) return;
    setLoading(true);

    ApiService.get(API_LINK.StaffAssignments(staff.id), { params })
      .then((res) => {
        if (res.status === "success") {
          setData({ data: res?.data ?? [], total: res?.total ?? 0 });
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
            type: "error",
          });
        }
      })
      .catch((error) => {
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load work history",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, staff?.id, params, setNotification]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const rows = useMemo(() => {
    if (!data.data || data.data.length === 0) return [];

    const offset = (params.page - 1) * params.per_page;

    return data.data.map((row, index) => ({
      key: row.id,
      id: 1 + index + offset,
      outlet: (
        <div className="cell-stack">
          <span className="cell-title">{row.outlet?.name}</span>
          <span className="cell-sub">{row.outlet?.parent?.name}</span>
        </div>
      ),
      startDate: format(toDay(row.startDate), "dd MMM yyyy"),
      endDate: row.endDate ? (
        format(toDay(row.endDate), "dd MMM yyyy")
      ) : (
        <span className="posting-current">Present</span>
      ),
      duration: durationOf(row.startDate, row.endDate),
      note: row.note ? <span className="cell-sub">{row.note}</span> : "—",
    }));
  }, [data, params.page, params.per_page]);

  const handleChanges = useCallback(({ page, pageSize, sortField, sort }) => {
    setParams((prev) => ({
      ...prev,
      page,
      per_page: pageSize,
      sort_by: sortField ?? DEFAULT_PARAMS.sort_by,
      order_by: sort?.direction ?? DEFAULT_PARAMS.order_by,
    }));
  }, []);

  const worked = staff?.outletsWorked ?? 0;

  return (
    <CustomDialog
      open={open}
      openChange={(next) => {
        if (!next) {
          setParams(DEFAULT_PARAMS);
          onClose?.();
        }
      }}
      title={staff ? `${staff.firstName} ${staff.lastName} · Work History` : "Work History"}
      description={`Worked at ${worked} outlet${worked === 1 ? "" : "s"} across ${data.total} posting${data.total === 1 ? "" : "s"}.`}
      footer={false}
      className="item-outlets-dialog"
    >
      <CustomTable
        columns={StaffAssignmentColumn}
        dataSource={rows}
        rowKey="key"
        loading={loading}
        total={data.total}
        pageSize={params.per_page}
        onChange={handleChanges}
        showSearch={false}
        reloadAction={fetchHistory}
        showReload={true}
        emptyText="No posting has been recorded yet"
        className="table-card-plain"
      />
    </CustomDialog>
  );
}
