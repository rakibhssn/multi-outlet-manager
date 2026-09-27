import React, { useState } from "react";
import { LuCircleCheck, LuPlus, LuPrinter } from "react-icons/lu";
import { AnimateButton, CustomDialog } from "@/components/custom";
import { DialogFooter } from "@/components/ui/dialog";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatMoney, plural } from "@/lib/Functions/Common";
import { OrderLines, OrderMeta } from "./OrderParts";
import { orderTypeText } from "@/lib/Functions/Order";

export default function OrderConfirm({
  open,
  outletId,
  server,
  details,
  lines = [],
  placedOrder,
  onClose,
  onConfirmed,
  onSlip,
  onDone,
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = lines.reduce(
    (sum, line) => sum + line.quantity * line.item.price,
    0,
  );
  const tableNumber =
    details.orderType === "DINE_IN" ? details.tableNumber.trim() : "";
  const customerName = details.customerName.trim();
  const note = details.note.trim();

  function handleConfirm() {
    setLoading(true);
    const order = {
      branchId: outletId,
      serverId: server?.value,
      orderType: details.orderType,
      tableNumber: details.tableNumber,
      customerName: details.customerName,
      note: details.note,
      items: lines.map(({ item, quantity }) => ({
        menuItemId: item.id,
        quantity,
      })),
    };

    notify
      .load(ApiService.post(API_LINK.SalesOrder, order), {
        errorText: "Failed to confirm order",
        onSuccess: (res) => onConfirmed?.(res.data),
      })
      .finally(() => setLoading(false));
  }

  if (placedOrder) {
    return (
      <CustomDialog
        open={open}
        openChange={(next) => !next && onDone?.()}
        title="Order Confirmed"
        footer={
          <DialogFooter className="dialog-footer">
            <AnimateButton
              variant="outline"
              size="sm"
              preIcon={LuPlus}
              label="New Order"
              onClick={onDone}
            />
            {onSlip && (
              <AnimateButton
                size="sm"
                preIcon={LuPrinter}
                label="Generate Order Slip"
                onClick={onSlip}
              />
            )}
          </DialogFooter>
        }
      >
        <div className="order-done">
          <LuCircleCheck className="order-done-icon" />
          <span className="order-done-number">{placedOrder.orderNumber}</span>
          <span className="cell-sub">
            {plural(placedOrder.totalItems, "item")} ·{" "}
            {formatMoney(placedOrder.totalAmount)}
          </span>
          <span className="cell-sub">
            {placedOrder.slipPrintedAt
              ? "Order slip generated"
              : "Stock updated. Generate the slip for the kitchen or guest."}
          </span>
        </div>
      </CustomDialog>
    );
  }

  return (
    <CustomDialog
      open={open}
      openChange={(next) => !next && onClose?.()}
      title="Confirm Order"
      description="Check the order before confirming. Stock is deducted once it is confirmed."
      submitLabel="Confirm Order"
      submitLoading={loading}
      submitDisabled={!lines.length || !server}
      onSubmit={handleConfirm}
      className="order-confirm-dialog"
    >
      <OrderMeta
        items={[
          { label: "Server", value: server?.label ?? "—" },
          {
            label: "Type",
            value: orderTypeText(details.orderType, tableNumber),
          },
          customerName && { label: "Customer", value: customerName },
        ]}
      />

      <OrderLines
        lines={lines.map(({ item, quantity }) => ({
          id: item.id,
          name: item.name,
          quantity,
          unitPrice: item.price,
          lineTotal: quantity * item.price,
        }))}
        totalItems={totalItems}
        totalAmount={totalAmount}
      />

      {note && <p className="order-confirm-note">Note: {note}</p>}
    </CustomDialog>
  );
}
