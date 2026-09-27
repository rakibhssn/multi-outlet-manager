import React, { useCallback, useEffect, useState } from "react";
import { LuCircleCheck, LuPrinter, LuX } from "react-icons/lu";
import { AnimateButton, CustomDialog, StatusComp } from "@/components/custom";
import { DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { formatDateTime, fullName } from "@/lib/Functions/Common";
import { OrderLines, OrderMeta } from "./OrderParts";
import { orderTypeText } from "@/lib/Functions/Order";
import OrderSlip from "./OrderSlip";

export default function SalesOrderDetails({
  open,
  orderId,
  onClose,
  onChange,
}) {
  const notify = useNotify();
  const can = useCan();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [slipOpen, setSlipOpen] = useState(false);
  const [askCancel, setAskCancel] = useState(false);

  const fetchOrder = useCallback(() => {
    if (!open || !orderId) return;
    setLoading(true);

    notify
      .load(ApiService.get(API_LINK.SalesOrderDetails(orderId)), {
        errorText: "Failed to load order",
        onSuccess: (res) => setOrder(res.data),
      })
      .finally(() => setLoading(false));
  }, [open, orderId, notify]);

  useEffect(() => {
    if (!open) setOrder(null);
    setAskCancel(false);
    fetchOrder();
  }, [open, fetchOrder]);

  const runAction = useCallback(
    (action, link) => {
      setActing(action);

      notify
        .submit(ApiService.patch(link), {
          errorText: "Failed to update order",
          onSuccess: (res) => {
            setOrder(res.data);
            setAskCancel(false);
            onChange?.();
          },
        })
        .finally(() => setActing(null));
    },
    [onChange, notify],
  );

  const confirmed = order?.status === "CONFIRMED";
  const canCancel = confirmed && can("orders.cancel");
  const canComplete = confirmed && can("orders.complete");
  const canSlip = order?.status !== "CANCELLED" && can("orders.slip");

  return (
    <>
      <CustomDialog
        open={open && !slipOpen}
        openChange={(next) => !next && onClose?.()}
        title={order ? `Order ${order.orderNumber}` : "Order"}
        description={
          order
            ? `${order.outlet?.name} · ${formatDateTime(order.confirmedAt)}`
            : undefined
        }
        footer={
          order && askCancel ? (
            <DialogFooter className="dialog-footer order-cancel-ask">
              <span className="order-cancel-text">
                Cancel this order? Its items go back into stock.
              </span>
              <AnimateButton
                variant="outline"
                size="sm"
                label="Keep Order"
                disabled={!!acting}
                onClick={() => setAskCancel(false)}
              />
              <AnimateButton
                variant="destructive"
                size="sm"
                label="Yes, Cancel"
                loading={acting === "cancel"}
                onClick={() =>
                  runAction("cancel", API_LINK.SalesOrderCancel(order.id))
                }
              />
            </DialogFooter>
          ) : order ? (
            <DialogFooter className="dialog-footer">
              {canCancel && (
                <AnimateButton
                  variant="outline"
                  size="sm"
                  preIcon={LuX}
                  label="Cancel Order"
                  className="order-cancel-btn"
                  disabled={!!acting}
                  onClick={() => setAskCancel(true)}
                />
              )}
              {canComplete && (
                <AnimateButton
                  variant="outline"
                  size="sm"
                  preIcon={LuCircleCheck}
                  label="Mark Completed"
                  loading={acting === "complete"}
                  disabled={!!acting}
                  onClick={() =>
                    runAction("complete", API_LINK.SalesOrderComplete(order.id))
                  }
                />
              )}
              {canSlip && (
                <AnimateButton
                  size="sm"
                  preIcon={LuPrinter}
                  label="Generate Order Slip"
                  disabled={!!acting}
                  onClick={() => setSlipOpen(true)}
                />
              )}
            </DialogFooter>
          ) : null
        }
        className="order-details-dialog"
      >
        {loading && !order ? (
          <div className="order-lines">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        ) : order ? (
          <>
            <OrderMeta
              items={[
                { label: "Status", value: <StatusComp type={order.status} /> },
                { label: "Server", value: fullName(order.server) || "—" },
                {
                  label: "Type",
                  value: orderTypeText(order.orderType, order.tableNumber),
                },
                { label: "Customer", value: order.customerName ?? "—" },
                { label: "Taken by", value: order.createdBy?.email ?? "—" },
                {
                  label: "Slip",
                  value: formatDateTime(order.slipPrintedAt) ?? "Not generated",
                },
                order.completedAt && {
                  label: "Completed",
                  value: formatDateTime(order.completedAt),
                },
                order.cancelledAt && {
                  label: "Cancelled",
                  value: formatDateTime(order.cancelledAt),
                },
              ]}
            />

            <OrderLines
              lines={(order.items ?? []).map((line) => ({
                ...line,
                name: line.itemName,
              }))}
              totalItems={order.totalItems}
              totalAmount={order.totalAmount}
            />

            {order.note && (
              <p className="order-confirm-note">Note: {order.note}</p>
            )}
          </>
        ) : null}
      </CustomDialog>

      <OrderSlip
        open={slipOpen}
        order={order}
        onClose={() => setSlipOpen(false)}
        onPrinted={(next) => {
          setOrder(next);
          onChange?.();
        }}
      />
    </>
  );
}
