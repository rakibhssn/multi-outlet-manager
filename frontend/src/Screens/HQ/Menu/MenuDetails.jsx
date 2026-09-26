import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAtom, useSetAtom } from "jotai";
import { LuArrowLeft, LuPencil } from "react-icons/lu";
import { AnimateButton } from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { breadcrumbLabels, notificationModal } from "@/lib/Variables";
import MenuEntry from "./MenuEntry";
import MenuTab from "./MenuTab";

export default function MenuDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [, setNotification] = useAtom(notificationModal);
  const setLabels = useSetAtom(breadcrumbLabels);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);

  const fetchMenu = useCallback(() => {
    setLoading(true);

    ApiService.get(API_LINK.MenuDetails(id))
      .then((res) => {
        if (res.status === "success") {
          setMenu(res?.data);
          setLabels((prev) => ({ ...prev, [`/hq/menu/${id}`]: res?.data?.name }));
        } else {
          setNotification({
            open: true,
            title: "Error",
            description: res.message,
            type: "error",
          });
        }
      })
      .catch((error) => {
        setMenu(null);
        setNotification({
          open: true,
          title: "Error",
          description: error?.response?.data?.message ?? "Failed to load menu",
          type: "error",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, setLabels, setNotification]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

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
        <PageHeader title="Menu not found" subtitle="It may have been deleted." actions={back} />
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
            <AnimateButton preIcon={LuPencil} label="Edit Menu" onClick={() => setOpenModal(true)} />
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
