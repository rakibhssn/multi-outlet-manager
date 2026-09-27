import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format, startOfMonth, subDays } from "date-fns";
import {
  LuChartColumn,
  LuClock,
  LuDownload,
  LuFileText,
  LuPackage,
  LuPrinter,
  LuShieldOff,
  LuSoup,
  LuUserCheck,
  LuUsers,
} from "react-icons/lu";
import {
  AnimateButton,
  AutoCompleteField,
  CustomDatepicker,
  CustomTab,
} from "@/components/custom";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import usePolling from "@/hooks/usePolling";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { outletOption, staffOption } from "@/lib/Functions/Common";
import { downloadReportPdf } from "@/lib/Functions/Pdf";
import { REPORT_TYPES, downloadReport } from "@/lib/Functions/Report";
import { cn } from "@/lib/utils";
import ReportSheet from "./ReportSheet";

const TAB_ICONS = {
  sales: LuChartColumn,
  items: LuSoup,
  servers: LuUsers,
  shifts: LuClock,
  attendance: LuUserCheck,
  stock: LuPackage,
};

const TABS = REPORT_TYPES.map((item) => ({
  key: item.value,
  label: item.label,
  icon: TAB_ICONS[item.value],
}));

const day = (date) => format(date, "yyyy-MM-dd");

const ALL_OUTLETS = { label: "All outlets", value: "all" };

const ALL_STAFF = { label: "All staff", value: "all" };

const REFRESH_INTERVAL = 60000;

const PRESETS = [
  { label: "Today", range: () => [new Date(), new Date()] },
  { label: "Last 7 days", range: () => [subDays(new Date(), 6), new Date()] },
  { label: "Last 30 days", range: () => [subDays(new Date(), 29), new Date()] },
  { label: "This month", range: () => [startOfMonth(new Date()), new Date()] },
];

function ReportLoader({ label, overlay = false }) {
  return (
    <div
      className={cn("report-loader", overlay && "report-loader-overlay")}
      role="status"
      aria-live="polite"
    >
      <Spinner className="report-loader-icon" />
      <span>{label}</span>
    </div>
  );
}

export default function Reports() {
  const scope = useScope();
  const can = useCan();
  const notify = useNotify();
  const outletLocked = !!scope.outletId;
  const [outletId, setOutletId] = useState(scope.outletId ?? ALL_OUTLETS.value);
  const tabs = useMemo(
    () => TABS.filter((tab) => can(`reports.${tab.key}`)),
    [can],
  );
  const [type, setType] = useState(() => tabs[0]?.key ?? null);
  const [from, setFrom] = useState(day(subDays(new Date(), 6)));
  const [to, setTo] = useState(day(new Date()));
  const [report, setReport] = useState(null);
  const [pendingKey, setPendingKey] = useState(null);
  const [failedKey, setFailedKey] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [staffId, setStaffId] = useState(ALL_STAFF.value);
  const reportType = REPORT_TYPES.find((item) => item.value === type);
  const dated = reportType?.dated;
  const staffReport = !!reportType?.staff;
  const staffFilter =
    staffReport && staffId !== ALL_STAFF.value ? staffId : null;

  const outlets = useRemoteOptions({
    url: API_LINK.Outlet,
    params: { companyId: scope.companyId || undefined },
    mapOption: outletOption,
    enabled: !outletLocked,
    errorText: "Failed to load outlets",
  });

  const staffs = useRemoteOptions({
    url: API_LINK.Staff,
    params: {
      branchId: outletId !== ALL_OUTLETS.value ? outletId : undefined,
      companyId: scope.companyId || undefined,
      sort_by: "firstName",
    },
    mapOption: staffOption,
    enabled: staffReport,
    errorText: "Failed to load staff",
  });

  const staffOptions = useMemo(
    () => [ALL_STAFF, ...staffs.options],
    [staffs.options],
  );

  const outletOptions = useMemo(
    () => [ALL_OUTLETS, ...outlets.options],
    [outlets.options],
  );
  const requestKey = [
    type,
    outletId,
    dated ? `${from}_${to}` : "now",
    staffFilter ?? "all",
  ].join("|");
  const latestKey = useRef(requestKey);
  latestKey.current = requestKey;

  const loadReport = () => {
    if (!type) return;
    const key = requestKey;
    const params = {
      branchId: outletId,
      ...(dated ? { from, to } : {}),
      ...(staffFilter ? { staffId: staffFilter } : {}),
    };
    setPendingKey(key);
    setFailedKey(null);
    notify
      .load(ApiService.get(API_LINK.Report(type), { params }), {
        errorText: "Failed to generate the report",
        onSuccess: (res) => {
          if (key === latestKey.current) setReport({ ...res.data, key });
        },
      })
      .then((ok) => {
        if (!ok && key === latestKey.current) setFailedKey(key);
      })
      .finally(() =>
        setPendingKey((current) => (current === key ? null : current)),
      );
  };

  usePolling(loadReport, REFRESH_INTERVAL, requestKey);

  const handlePdf = () => {
    setPdfLoading(true);
    downloadReportPdf(report)
      .catch(() => notify.error("Failed to create the PDF"))
      .finally(() => setPdfLoading(false));
  };

  const applyPreset = (preset) => {
    const [start, end] = preset.range();
    setFrom(day(start));
    setTo(day(end));
  };

  const ready = report?.key === requestKey;
  const loading = pendingKey === requestKey;
  const failed = failedKey === requestKey && !ready;
  const busy = !ready || loading;
  const reportLabel =
    REPORT_TYPES.find((item) => item.value === type)?.label ?? "report";

  if (!tabs.length) {
    return (
      <div className="no-access">
        <LuShieldOff className="no-access-icon" />
        <p className="no-access-title">No reports enabled</p>
        <p className="no-access-text">
          Your role can open reports but no report is ticked for it. Please
          contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Reports"
        subtitle={
          outletLocked
            ? `Sales, stock and staff reports for ${scope.outletName ?? "this outlet"}`
            : "Sales, stock and staff reports for all outlets or one outlet"
        }
        actions={
          can("reports.export") && (
            <div className="report-actions">
              <AnimateButton
                variant="outline"
                preIcon={LuDownload}
                label="Download CSV"
                disabled={busy}
                onClick={() => downloadReport(report)}
              />
              <AnimateButton
                variant="outline"
                preIcon={LuFileText}
                label="Download PDF"
                loading={pdfLoading}
                disabled={busy}
                onClick={handlePdf}
              />
              <AnimateButton
                preIcon={LuPrinter}
                label="Print"
                disabled={busy}
                onClick={() => window.print()}
              />
            </div>
          )
        }
      />

      <CustomTab
        value={type}
        onChange={(value) => value && setType(value)}
        tabs={tabs}
        className="report-tabs"
        listClassName="report-tabs-list"
      />

      <section className="report-controls">
        {!outletLocked && (
          <AutoCompleteField
            label="Outlet"
            placeholder="Search outlet"
            options={outletOptions}
            onSearch={outlets.onSearch}
            loading={outlets.loading}
            filterLocally={false}
            value={outletId}
            onValueChange={(value) => {
              setOutletId(value ?? ALL_OUTLETS.value);
              setStaffId(ALL_STAFF.value);
            }}
          />
        )}
        {staffReport && (
          <AutoCompleteField
            label="Staff"
            placeholder="Search staff"
            options={staffOptions}
            onSearch={staffs.onSearch}
            loading={staffs.loading}
            filterLocally={false}
            value={staffId}
            onValueChange={(value) => setStaffId(value ?? ALL_STAFF.value)}
          />
        )}
        <CustomDatepicker
          label="From"
          clearable={false}
          disabled={!dated}
          maxDate={new Date(`${to}T00:00:00`)}
          value={from}
          onChange={(date) => date && setFrom(day(date))}
        />
        <CustomDatepicker
          label="To"
          clearable={false}
          disabled={!dated}
          minDate={new Date(`${from}T00:00:00`)}
          maxDate={new Date()}
          value={to}
          onChange={(date) => date && setTo(day(date))}
        />
        <div
          className={cn("report-presets", !dated && "report-presets-disabled")}
        >
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={!dated}
              onClick={() => applyPreset(preset)}
              className="report-preset"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {!ready && !failed && (
        <ReportLoader label={`Generating ${reportLabel} report…`} />
      )}
      {failed && (
        <div className="report-failed">
          <span>The report could not be generated.</span>
          <AnimateButton
            variant="outline"
            size="sm"
            label="Try again"
            onClick={loadReport}
          />
        </div>
      )}
      {ready && (
        <p className="report-live">
          <span className="shift-dot" />
          Live · updated {format(new Date(report.generatedAt), "hh:mm:ss a")} ·
          refreshes every minute
        </p>
      )}
      {ready && (
        <div className="report-frame">
          <ReportSheet report={report} />
          {loading && <ReportLoader label="Refreshing report…" overlay />}
        </div>
      )}
      {ready &&
        createPortal(
          <div className="print-root">
            <ReportSheet report={report} />
          </div>,
          document.body,
        )}
    </div>
  );
}
