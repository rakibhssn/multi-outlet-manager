import React, { useState } from "react";
import { LuInfo, LuSoup } from "react-icons/lu";
import { CustomTab } from "@/components/custom";
import MenuItemList from "@/Screens/HQ/MenuItem/MenuItemList";
import MenuInfoTab from "./MenuInfoTab";

export default function MenuTab({ menu, onChange }) {
  const [tab, setTab] = useState("details");

  return (
    <CustomTab
      value={tab}
      onChange={setTab}
      tabs={[
        {
          key: "details",
          label: "Details",
          icon: LuInfo,
          content: <MenuInfoTab menu={menu} />,
        },
        {
          key: "items",
          label: `Menu Items (${menu?._count?.menuItems ?? 0})`,
          icon: LuSoup,
          content: (
            <MenuItemList
              key={menu?.id}
              menuId={menu?.id}
              menuName={menu?.name}
              onChange={onChange}
            />
          ),
        },
      ]}
    />
  );
}
