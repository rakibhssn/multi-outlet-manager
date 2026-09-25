import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const emptyNotifyData = {
  open: false,
  title: null,
  description: null,
  body: null,
  type: null,
  onConfirm: () => undefined,
  onClose: () => undefined,
};

export const confirmModal = atom(emptyNotifyData);
export const notificationModal = atom(emptyNotifyData);
export const breadcrumbLabels = atom({});
export const userData = atomWithStorage(
  "data",
  {
    isLoggedIn: false,
    user: null,
  },
  undefined,
  { getOnInit: true },
);
