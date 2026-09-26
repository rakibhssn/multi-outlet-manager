export const CompanyColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 56 },
  { key: "name", title: "Company", dataIndex: "name", sortable: true, sortKey: "name" },
  {
    key: "contact",
    title: "Contact Person",
    dataIndex: "contact",
    sortable: true,
    sortKey: "contactPersonName",
  },
  { key: "account", title: "Login Account", dataIndex: "account" },
  { key: "outlets", title: "Outlets", dataIndex: "outlets", align: "center" },
  { key: "location", title: "Location", dataIndex: "location", sortable: true, sortKey: "city" },
  { key: "status", title: "Status", dataIndex: "status", sortable: true, sortKey: "status" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const OutletColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 56 },
  { key: "name", title: "Outlet", dataIndex: "name", sortable: true, sortKey: "name" },
  {
    key: "contact",
    title: "Contact Person",
    dataIndex: "contact",
    sortable: true,
    sortKey: "contactPersonName",
  },
  { key: "account", title: "Login Account", dataIndex: "account" },
  { key: "location", title: "Location", dataIndex: "location", sortable: true, sortKey: "city" },
  { key: "staffs", title: "Staff", dataIndex: "staffs", align: "center" },
  { key: "status", title: "Status", dataIndex: "status", sortable: true, sortKey: "status" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const StaffColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 56 },
  { key: "name", title: "Staff", dataIndex: "name", sortable: true, sortKey: "firstName" },
  { key: "outlet", title: "Outlet", dataIndex: "outlet" },
  { key: "job", title: "Job", dataIndex: "job", sortable: true, sortKey: "designation" },
  { key: "worked", title: "Outlets Worked", dataIndex: "worked", align: "center" },
  { key: "contact", title: "Contact", dataIndex: "contact" },
  { key: "account", title: "Login Account", dataIndex: "account" },
  { key: "status", title: "Status", dataIndex: "status", sortable: true, sortKey: "status" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const MenuColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 56 },
  { key: "name", title: "Menu", dataIndex: "name", sortable: true, sortKey: "name" },
  { key: "items", title: "Items", dataIndex: "items", align: "center" },
  { key: "outlets", title: "Outlets", dataIndex: "outlets", align: "center" },
  { key: "status", title: "Status", dataIndex: "status", sortable: true, sortKey: "status" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const MenuItemColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 56 },
  { key: "name", title: "Item", dataIndex: "name", sortable: true, sortKey: "name" },
  { key: "menu", title: "Menu", dataIndex: "menu" },
  { key: "price", title: "Price", dataIndex: "price", align: "right" },
  { key: "outlets", title: "Outlets", dataIndex: "outlets", align: "center" },
  { key: "status", title: "Status", dataIndex: "status", sortable: true, sortKey: "status" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const MenuItemOutletColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 48 },
  { key: "name", title: "Outlet", dataIndex: "name" },
  { key: "defaultPrice", title: "Default", dataIndex: "defaultPrice", align: "right" },
  { key: "outletPrice", title: "Outlet Price", dataIndex: "outletPrice", align: "right" },
  { key: "stock", title: "Stock", dataIndex: "stock", align: "center" },
  { key: "status", title: "Status", dataIndex: "status" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const OutletItemColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 48 },
  { key: "name", title: "Item", dataIndex: "name", sortable: true, sortKey: "name" },
  { key: "defaultPrice", title: "Default", dataIndex: "defaultPrice", align: "right" },
  { key: "outletPrice", title: "Outlet Price", dataIndex: "outletPrice", align: "right" },
  { key: "stock", title: "Stock", dataIndex: "stock", align: "center" },
  { key: "status", title: "Status", dataIndex: "status", sortable: true, sortKey: "status" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const StockOutColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 48 },
  { key: "name", title: "Item", dataIndex: "name" },
  { key: "price", title: "Price Here", dataIndex: "price", align: "right" },
  { key: "stock", title: "Stock", dataIndex: "stock", align: "center" },
  { key: "action", title: "Actions", dataIndex: "action", align: "right" },
];

export const StaffAssignmentColumn = [
  { key: "id", title: "#", dataIndex: "id", width: 48 },
  { key: "outlet", title: "Outlet", dataIndex: "outlet" },
  { key: "startDate", title: "Start", dataIndex: "startDate", sortable: true, sortKey: "startDate" },
  { key: "endDate", title: "End", dataIndex: "endDate", sortable: true, sortKey: "endDate" },
  { key: "duration", title: "Duration", dataIndex: "duration" },
  { key: "note", title: "Note", dataIndex: "note" },
];
