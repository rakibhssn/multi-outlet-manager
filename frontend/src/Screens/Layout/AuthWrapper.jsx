import React from "react";
import { Outlet } from "react-router";
import Header from "./Header";
import { useAtom } from "jotai";
import { confirmModal, emptyNotifyData } from "@/lib/Variables";
import { CustomDialog } from "@/components/custom";
import Sidebar from "./Sidebar";
import Breadcrumbs from "./Breadcrumbs";
import { SidebarMobileTrigger, SidebarProvider } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import useAccessSync from "@/hooks/useAccessSync";

export default function AuthWrapper() {
  const [confirmation, setConfirmation] = useAtom(confirmModal);
  useAccessSync();

  return (
    <>
      <SidebarProvider
        style={{
          "--sidebar-width": "15rem",
          "--sidebar-width-icon": "3rem",
        }}
      >
        <div className="layout-shell">
          <Header />
          <div className="layout-main">
            <Sidebar />
            <main className="layout-body">
              <Breadcrumbs />
              <div className="layout-content">
                <ScrollArea className="layout-scroll">
                  <Outlet />
                </ScrollArea>
              </div>
            </main>
          </div>
        </div>
        <SidebarMobileTrigger />
      </SidebarProvider>
      <CustomDialog
        open={confirmation?.open}
        openChange={() => setConfirmation(emptyNotifyData)}
        title={confirmation?.title}
        description={confirmation?.description}
        footer={confirmation?.footer ?? false}
        showCloseButton={confirmation?.cancelButton ?? false}
        submitButtonLabel={confirmation?.submitLabel ?? ""}
        submitButtonClassName={`${confirmation?.submitClassName ?? ""} ${confirmation?.remove ? "delete__button" : ""}`}
        submitButtonClick={confirmation?.submitClick}
      >
        {confirmation?.body && confirmation?.body !== "" && (
          <p>{confirmation?.body}</p>
        )}
        {confirmation?.error && (
          <p className="confirmation__error">{confirmation.error}</p>
        )}
      </CustomDialog>
    </>
  );
}
