import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CustomTooltip({ title, side = "top", children }) {
  if (!title) return children;

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>{title}</TooltipContent>
    </Tooltip>
  );
}
