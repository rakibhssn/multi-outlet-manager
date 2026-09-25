import React from "react";
import { Link } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { renderIcon } from "./fieldUtils";

export default function CustomDropDown({
  trigger,
  nativeButton = true,
  groups = [],
  custom,
  align = "end",
  contentClassName,
  itemClassName,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger nativeButton={nativeButton} render={trigger} />
      {custom ?? (
        <DropdownMenuContent align={align} className={cn("dropdown", contentClassName)}>
          {groups.map((group, index) => (
            <React.Fragment key={group.label ?? index}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                {group.label && <DropdownMenuLabel>{group.label}</DropdownMenuLabel>}
                {(group.items ?? []).map((item, ind) => {
                  const text = item.label ?? item.title;
                  return (
                    <DropdownMenuItem
                      key={item.key ?? ind}
                      variant={item.variant}
                      disabled={item.disabled}
                      onClick={() => item.onClick?.(item.value)}
                      render={item.link ? <Link to={item.link} /> : undefined}
                      className={cn("dropdown-item", itemClassName)}
                    >
                      {renderIcon(item.icon, "dropdown-item-icon")}
                      {text}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
}
