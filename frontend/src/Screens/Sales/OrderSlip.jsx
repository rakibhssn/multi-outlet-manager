import React, { useState } from "react";
import { createPortal } from "react-dom";
import { LuFileText, LuPrinter } from "react-icons/lu";
import { AnimateButton, CustomDialog } from "@/components/custom";
import { DialogFooter } from "@/components/ui/dialog";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import {
  formatDateTime,
  formatMoney,
  fullName,
  plural,
} from "@/lib/Functions/Common";
import { orderTypeText } from "@/lib/Functions/Order";
import { downloadSlipPdf } from "@/lib/Functions/Pdf";

export function SlipContent({ order }) {
  if (!order) return null;

  const outlet = order.outlet ?? {};
  const address = [outlet.address, outlet.city, outlet.state, outlet.zipCode]
    .filter(Boolean)
    .join(", ");
  const server = fullName(order.server) || "—";

  return (
    <div className="order-slip">
      <div className="order-slip-head">
        {outlet.parent?.name && (
          <span className="order-slip-brand">{outlet.parent.name}</span>
        )}
        <span className="order-slip-outlet">{outlet.name}</span>
        {address && <span className="order-slip-muted">{address}</span>}
        {outlet.contactPersonPhone && (
          <span className="order-slip-muted">
            Tel: {outlet.contactPersonPhone}
          </span>
        )}
      </div>

      <p className="order-slip-title">Order Slip</p>

      <dl className="order-slip-meta">
        <dt>Order</dt>
        <dd>{order.orderNumber}</dd>
        <dt>Date</dt>
        <dd>{formatDateTime(order.confirmedAt)}</dd>
        <dt>Type</dt>
        <dd>{orderTypeText(order.orderType, order.tableNumber)}</dd>
        <dt>Server</dt>
        <dd>{server}</dd>
        {order.customerName && (
          <>
            <dt>Customer</dt>
            <dd>{order.customerName}</dd>
          </>
        )}
      </dl>

      <div className="order-slip-lines">
        <div className="order-slip-line order-slip-line-head">
          <span>Item</span>
          <span>Qty</span>
          <span>Amount</span>
        </div>
        {(order.items ?? []).map((line) => (
          <div key={line.id} className="order-slip-line">
            <span className="order-slip-item">
              {line.itemName}
              <span className="order-slip-muted">
                @ {formatMoney(line.unitPrice)}
              </span>
            </span>
            <span>{line.quantity}</span>
            <span>{formatMoney(line.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="order-slip-total">
        <span>Total ({plural(order.totalItems, "item")})</span>
        <span>{formatMoney(order.totalAmount)}</span>
      </div>

      {order.note && <p className="order-slip-note">Note: {order.note}</p>}

      <p className="order-slip-foot">Thank you for dining with us!</p>
    </div>
  );
}

export default function OrderSlip({ open, order, onClose, onPrinted }) {
  const notify = useNotify();
  const [loading, setLoading] = useState(null);

  function generate(action, output) {
    setLoading(action);

    notify
      .load(ApiService.patch(API_LINK.SalesOrderSlip(order.id)), {
        errorText: `Failed to ${action === "pdf" ? "download" : "print"} the order slip`,
        onSuccess: (res) => {
          onPrinted?.(res?.data);
          return output(res?.data ?? order);
        },
      })
      .finally(() => setLoading(null));
  }

  const handlePrint = () =>
    generate("print", () => setTimeout(() => window.print(), 50));

  const handlePdf = () => generate("pdf", (slip) => downloadSlipPdf(slip));

  return (
    <>
      {open &&
        order &&
        createPortal(
          <div className="print-root">
            <SlipContent order={order} />
          </div>,
          document.body,
        )}
      <CustomDialog
        open={open}
        openChange={(next) => !next && onClose?.()}
        title="Order Slip"
        description={order ? `Slip for order ${order.orderNumber}` : undefined}
        footer={
          <DialogFooter className="dialog-footer">
            <AnimateButton
              variant="outline"
              size="sm"
              label="Close"
              onClick={onClose}
            />
            <AnimateButton
              variant="outline"
              size="sm"
              preIcon={LuFileText}
              label="Download PDF"
              loading={loading === "pdf"}
              disabled={!order || !!loading}
              onClick={handlePdf}
            />
            <AnimateButton
              size="sm"
              preIcon={LuPrinter}
              label="Print Slip"
              loading={loading === "print"}
              disabled={!order || !!loading}
              onClick={handlePrint}
            />
          </DialogFooter>
        }
        className="order-slip-dialog"
      >
        <SlipContent order={order} />
      </CustomDialog>
    </>
  );
}
