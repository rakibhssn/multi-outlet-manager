import React, { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { AnimateButton } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useCan from "@/hooks/useCan";
import useRecord from "@/hooks/useRecord";
import { API_LINK } from "@/lib/API_LINK";
import MenuEntry from "./MenuEntry";
import MenuTab from "./MenuTab";

export default function MenuDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useCan();
  const {
    record: menu,
    loading,
    reload: fetchMenu,
  } = useRecord(API_LINK.MenuDetails(id), {
    breadcrumb: `/hq/menu/${id}`,
    errorText: "Failed to load menu",
  });
  const [openModal, setOpenModal] = useState(false);

  const back = (
    <AnimateButton
      variant="outline"
      preIcon={LuArrowLeft}
      label="Back"
      onClick={() => navigate("/hq/menu")}
    />
  );

  if (loading && !menu) {
    return (
      <div className="page">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-10 w-96 rounded-md" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="page">
        <PageHeader
          title="Menu not found"
          subtitle="It may have been deleted."
          actions={back}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={menu.name}
        subtitle="Menu details and its items"
        actions={
          <>
            {back}
            {can("menus.edit") && (
              <AnimateButton
                preIcon={LuPencil}
                label="Edit Menu"
                onClick={() => setOpenModal(true)}
              />
            )}
          </>
        }
      />

      <MenuTab menu={menu} onChange={fetchMenu} />

      <MenuEntry
        open={openModal}
        menu={menu}
        onClose={() => setOpenModal(false)}
        onSaved={() => {
          setOpenModal(false);
          fetchMenu();
        }}
      />
    </div>
  );
}
