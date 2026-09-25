import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { renderIcon } from "./fieldUtils";

export default function CustomTab({
  value,
  defaultValue,
  onChange,
  tabs = [],
  className,
  listClassName,
  triggerClassName,
  contentClassName,
}) {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.key}
      onValueChange={onChange}
      className={cn("tabs", className)}
    >
      <TabsList className={cn("tabs-list", listClassName)}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            disabled={tab.disabled}
            className={cn("tabs-trigger", triggerClassName)}
          >
            {renderIcon(tab.icon, "tabs-trigger-icon")}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) =>
        tab.content !== undefined ? (
          <TabsContent key={tab.key} value={tab.key} className={cn("tabs-content", contentClassName)}>
            {tab.content}
          </TabsContent>
        ) : null,
      )}
    </Tabs>
  );
}
