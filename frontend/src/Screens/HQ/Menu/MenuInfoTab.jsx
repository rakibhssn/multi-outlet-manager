import React from "react";
import { format } from "date-fns";
import { LuImage } from "react-icons/lu";
import { StatusComp } from "@/components/custom";
import { DetailCard } from "@/Screens/Layout/DashboardBlocks";

export default function MenuInfoTab({ menu }) {
  return (
    <div className="menu-info">
      <div className="menu-info-image">
        {menu?.menuImage ? <img src={menu.menuImage} alt={menu.name} /> : <LuImage />}
      </div>
      <div className="detail-grid menu-info-grid">
        <DetailCard
          title="Menu"
          items={[
            { label: "Name", value: menu?.name },
            { label: "Status", value: <StatusComp type={menu?.status} /> },
            {
              label: "Created",
              value: menu?.createdAt ? format(new Date(menu.createdAt), "dd MMM yyyy") : null,
            },
          ]}
        />
        <DetailCard
          title="Summary"
          items={[
            { label: "Menu Items", value: String(menu?._count?.menuItems ?? 0) },
            { label: "Sold At Outlets", value: String(menu?.outletCount ?? 0) },
            {
              label: "Last Updated",
              value: menu?.updatedAt ? format(new Date(menu.updatedAt), "dd MMM yyyy") : null,
            },
          ]}
        />
        <DetailCard
          title="Description"
          items={[{ label: "About this menu", value: menu?.description }]}
        />
      </div>
    </div>
  );
}
