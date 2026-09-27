import { format } from "date-fns";
import { formatDateTime, formatMoney, fullName, plural } from "./Common";
import {
  LEVEL_TONES,
  formatReportValue,
  reportFileName,
  reportPeriod,
  slug,
  staffLabel,
} from "./Report";
import { orderTypeText } from "./Order";

const INK = [23, 23, 23];
const MUTED = [115, 115, 115];
const LINE = [212, 212, 212];
const HEAD_FILL = [245, 245, 245];
const LEVEL_PDF = {
  good: { text: [4, 120, 87], fill: [209, 250, 229] },
  warning: { text: [146, 94, 0], fill: [253, 240, 199] },
  serious: { text: [185, 28, 28], fill: [254, 226, 226] },
  critical: { text: [255, 255, 255], fill: [201, 42, 42] },
};

const RIGHT_TYPES = ["money", "number", "percent", "minutes"];
const WIDE_TABLE = 7;

async function loadPdf() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}

const addressOf = (outlet) =>
  [outlet.address, outlet.city, outlet.state, outlet.zipCode, outlet.country]
    .filter(Boolean)
    .join(", ");

function reportHeader(doc, report, margin) {
  const width = doc.internal.pageSize.getWidth();
  const { outlet } = report;
  let left = margin;

  doc
    .setTextColor(...MUTED)
    .setFont("helvetica", "bold")
    .setFontSize(8);
  if (outlet.parent?.name) {
    doc.text(outlet.parent.name.toUpperCase(), margin, left);
    left += 6;
  }
  doc
    .setTextColor(...INK)
    .setFontSize(15)
    .text(outlet.name, margin, left);
  doc
    .setTextColor(...MUTED)
    .setFont("helvetica", "normal")
    .setFontSize(8);
  const addressLines = doc.splitTextToSize(addressOf(outlet), width / 2);
  doc.text(addressLines, margin, left + 5);
  const phoneY = left + 5 + addressLines.length * 3.8;
  if (outlet.contactPersonPhone) {
    doc.text(`Tel: ${outlet.contactPersonPhone}`, margin, phoneY);
  }

  doc
    .setTextColor(...INK)
    .setFont("helvetica", "bold")
    .setFontSize(17);
  doc.text(report.title, width - margin, margin, { align: "right" });
  doc
    .setFontSize(9)
    .text(
      report.staff
        ? `${reportPeriod(report)} · Staff: ${staffLabel(report.staff)}`
        : reportPeriod(report),
      width - margin,
      margin + 7,
      { align: "right" },
    );
  doc
    .setTextColor(...MUTED)
    .setFont("helvetica", "normal")
    .setFontSize(8);
  doc.text(
    `Generated ${formatDateTime(report.generatedAt)}`,
    width - margin,
    margin + 12,
    { align: "right" },
  );

  const bottom = Math.max(phoneY + 4, margin + 16);
  doc
    .setDrawColor(...INK)
    .setLineWidth(0.6)
    .line(margin, bottom, width - margin, bottom);
  return bottom + 6;
}

function reportSummary(doc, report, top, margin) {
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const perRow = 4;
  const gap = 3;
  const boxWidth = (width - gap * (perRow - 1)) / perRow;
  const boxHeight = 13;

  report.summary.forEach((item, index) => {
    const x = margin + (index % perRow) * (boxWidth + gap);
    const y = top + Math.floor(index / perRow) * (boxHeight + gap);
    doc
      .setDrawColor(...LINE)
      .setLineWidth(0.2)
      .roundedRect(x, y, boxWidth, boxHeight, 1.5, 1.5);
    doc
      .setTextColor(...MUTED)
      .setFont("helvetica", "normal")
      .setFontSize(7)
      .text(item.label, x + 3, y + 4.5);
    doc
      .setTextColor(...INK)
      .setFont("helvetica", "bold")
      .setFontSize(10);
    doc.text(formatReportValue(item.value, item.type), x + 3, y + 10, {
      maxWidth: boxWidth - 6,
    });
  });

  return (
    top + Math.ceil(report.summary.length / perRow) * (boxHeight + gap) + 2
  );
}

function pageFooters(doc, report, margin) {
  const pages = doc.getNumberOfPages();
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc
      .setTextColor(...MUTED)
      .setFont("helvetica", "normal")
      .setFontSize(7);
    doc.text(
      `Tablewise · ${report.title} · ${report.outlet.name}`,
      margin,
      height - 7,
    );
    doc.text(`Page ${page} of ${pages}`, width - margin, height - 7, {
      align: "right",
    });
  }
}

export async function downloadReportPdf(report) {
  const { jsPDF, autoTable } = await loadPdf();
  const margin = 14;
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: report.columns.length > WIDE_TABLE ? "landscape" : "portrait",
  });

  const summaryBottom = reportSummary(
    doc,
    report,
    reportHeader(doc, report, margin),
    margin,
  );
  const cell = (row, column) =>
    formatReportValue(row?.[column.key] ?? "", column.type);
  const columnStyles = Object.fromEntries(
    report.columns.map((column, index) => [
      index,
      { halign: RIGHT_TYPES.includes(column.type) ? "right" : "left" },
    ]),
  );

  autoTable(doc, {
    startY: summaryBottom,
    margin: { left: margin, right: margin, bottom: 14 },
    head: [report.columns.map((column) => column.title)],
    body: report.rows.length
      ? report.rows.map((row) =>
          report.columns.map((column) => cell(row, column)),
        )
      : [
          [
            {
              content: "No data for this period",
              colSpan: report.columns.length,
              styles: { halign: "center" },
            },
          ],
        ],
    foot:
      report.totals && report.rows.length
        ? [report.columns.map((column) => cell(report.totals, column))]
        : undefined,
    showHead: "everyPage",
    showFoot: "lastPage",
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: INK,
      cellPadding: 2,
      lineColor: LINE,
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: MUTED,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    footStyles: { fontStyle: "bold", lineWidth: { top: 0.5 }, lineColor: INK },
    bodyStyles: { lineWidth: { bottom: 0.1 } },
    columnStyles,
    didParseCell: (data) => {
      if (data.section !== "body")
        data.cell.styles.halign = columnStyles[data.column.index]?.halign;
      const level =
        data.section === "body" &&
        report.columns[data.column.index]?.type === "level";
      const tone = level ? LEVEL_PDF[LEVEL_TONES[data.cell.raw]] : null;
      if (tone) {
        data.cell.styles.textColor = tone.text;
        data.cell.styles.fillColor = tone.fill;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  pageFooters(doc, report, margin);
  doc.save(reportFileName(report, "pdf"));
}

const SLIP_WIDTH = 80;
const SLIP_MARGIN = 5;

function slipLines(order) {
  const outlet = order.outlet ?? {};
  const meta = [
    ["Order", order.orderNumber],
    ["Date", formatDateTime(order.confirmedAt)],
    ["Type", orderTypeText(order.orderType, order.tableNumber)],
    ["Server", fullName(order.server) || "—"],
    ...(order.customerName ? [["Customer", order.customerName]] : []),
  ];
  return { outlet, meta, address: addressOf(outlet) };
}

function drawSlip(doc, autoTable, order) {
  const { outlet, meta, address } = slipLines(order);
  const center = SLIP_WIDTH / 2;
  const inner = SLIP_WIDTH - SLIP_MARGIN * 2;
  let y = 8;

  doc
    .setFont("courier", "bold")
    .setFontSize(10)
    .setTextColor(...INK);
  if (outlet.parent?.name) {
    doc.text(outlet.parent.name.toUpperCase(), center, y, { align: "center" });
    y += 4.5;
  }
  doc.setFontSize(9).text(outlet.name ?? "", center, y, { align: "center" });
  doc
    .setFont("courier", "normal")
    .setFontSize(7)
    .setTextColor(...MUTED);
  const addressLines = doc.splitTextToSize(address, inner);
  doc.text(addressLines, center, y + 4, { align: "center" });
  y += 4 + addressLines.length * 3;
  if (outlet.contactPersonPhone) {
    doc.text(`Tel: ${outlet.contactPersonPhone}`, center, y + 1, {
      align: "center",
    });
    y += 4;
  }

  doc
    .setDrawColor(...MUTED)
    .setLineDashPattern([1, 1], 0)
    .line(SLIP_MARGIN, y + 1, SLIP_WIDTH - SLIP_MARGIN, y + 1);
  doc
    .setFont("courier", "bold")
    .setFontSize(9)
    .setTextColor(...INK)
    .text("ORDER SLIP", center, y + 5.5, { align: "center" });
  doc.line(SLIP_MARGIN, y + 7.5, SLIP_WIDTH - SLIP_MARGIN, y + 7.5);
  y += 12;

  doc.setFontSize(8);
  meta.forEach(([label, value]) => {
    doc
      .setFont("courier", "normal")
      .setTextColor(...MUTED)
      .text(label, SLIP_MARGIN, y);
    doc
      .setTextColor(...INK)
      .text(String(value), SLIP_WIDTH - SLIP_MARGIN, y, { align: "right" });
    y += 4;
  });

  autoTable(doc, {
    startY: y + 1,
    margin: { left: SLIP_MARGIN, right: SLIP_MARGIN },
    head: [["Item", "Qty", "Amount"]],
    body: (order.items ?? []).map((line) => [
      `${line.itemName}\n@ ${formatMoney(line.unitPrice)}`,
      String(line.quantity),
      formatMoney(line.lineTotal),
    ]),
    foot: [
      [
        `Total (${plural(order.totalItems, "item")})`,
        "",
        formatMoney(order.totalAmount),
      ],
    ],
    theme: "plain",
    styles: {
      font: "courier",
      fontSize: 8,
      textColor: INK,
      cellPadding: { top: 1, bottom: 1, left: 0, right: 0 },
    },
    headStyles: { fontStyle: "bold" },
    footStyles: {
      fontStyle: "bold",
      fontSize: 9,
      lineWidth: { top: 0.3 },
      lineColor: MUTED,
    },
    columnStyles: {
      0: { cellWidth: inner - 30 },
      1: { halign: "right", cellWidth: 10 },
      2: { halign: "right", cellWidth: 20 },
    },
    didParseCell: (data) => {
      if (data.section !== "body" && data.column.index > 0)
        data.cell.styles.halign = "right";
    },
  });

  y = doc.lastAutoTable.finalY + 5;
  doc.setFont("courier", "normal").setFontSize(7.5);
  if (order.note) {
    const note = doc.splitTextToSize(`Note: ${order.note}`, inner);
    doc.text(note, SLIP_MARGIN, y);
    y += note.length * 3.5 + 2;
  }
  doc
    .setTextColor(...MUTED)
    .text("Thank you for dining with us!", center, y + 1, { align: "center" });
  return y + 6;
}

export async function downloadSlipPdf(order) {
  const { jsPDF, autoTable } = await loadPdf();
  const measure = new jsPDF({ unit: "mm", format: [SLIP_WIDTH, 1000] });
  const height = Math.ceil(drawSlip(measure, autoTable, order));
  const doc = new jsPDF({
    unit: "mm",
    format: [SLIP_WIDTH, Math.max(height, 90)],
  });
  drawSlip(doc, autoTable, order);
  doc.save(
    `order-slip-${slug(order.orderNumber)}-${format(new Date(order.confirmedAt), "yyyyMMdd")}.pdf`,
  );
}
