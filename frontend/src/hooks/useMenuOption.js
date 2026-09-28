import { useEffect, useState } from "react";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { nameOption } from "@/lib/Functions/Common";

export default function useMenuOption(menuId) {
  const [option, setOption] = useState(null);

  useEffect(() => {
    if (!menuId) return;
    ApiService.get(API_LINK.MenuDetails(menuId))
      .then((res) => {
        if (res.status === "success") setOption(nameOption(res.data));
      })
      .catch(() => setOption(null));
  }, [menuId]);

  return option;
}
