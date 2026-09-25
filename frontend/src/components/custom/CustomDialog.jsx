import React, { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import AnimateButton from "./AnimateButton";

export default function CustomDialog({
  open,
  openChange,
  trigger,
  nativeButton = true,
  title,
  description,
  children,
  footer = true,
  showCloseButton = true,
  cancelLabel = "Cancel",
  submitLabel = "Save",
  submitVariant = "default",
  submitLoading = false,
  submitDisabled = false,
  onSubmit,
  submitButtonLabel,
  submitButtonClassName,
  submitButtonClick,
  className,
  bodyClassName,
}) {
  const handleSubmit = submitButtonClick ?? onSubmit;
  const [innerOpen, setInnerOpen] = useState(false);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : innerOpen;

  const handleOpenChange = (next) => {
    if (!controlled) setInnerOpen(next);
    openChange?.(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger nativeButton={nativeButton} render={trigger} />}
      <DialogContent showCloseButton={showCloseButton} className={cn("dialog", className)}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle className="dialog-title">{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        <div className={cn("dialog-body", bodyClassName)}>{children}</div>
        {footer === true ? (
          <DialogFooter className="dialog-footer">
            <DialogClose render={<AnimateButton variant="outline" size="sm" label={cancelLabel} />} />
            {handleSubmit && (
              <AnimateButton
                size="sm"
                variant={submitVariant}
                label={submitButtonLabel || submitLabel}
                className={submitButtonClassName}
                loading={submitLoading}
                disabled={submitDisabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSubmit}
              />
            )}
          </DialogFooter>
        ) : (
          footer || null
        )}
      </DialogContent>
    </Dialog>
  );
}
