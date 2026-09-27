import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { useAtomValue } from "jotai";
import {
  LuMinus,
  LuPlus,
  LuReceipt,
  LuSearch,
  LuShoppingCart,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import {
  AnimateButton,
  AutoCompleteField,
  CustomRadioField,
  CustomTextarea,
  InputField,
} from "@/components/custom";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/Screens/Layout/DashboardBlocks";
import useRemoteOptions from "@/hooks/useRemoteOptions";
import useScope from "@/hooks/useScope";
import useCan from "@/hooks/useCan";
import useNotify from "@/hooks/useNotify";
import ApiService from "@/lib/ApiService";
import { API_LINK } from "@/lib/API_LINK";
import { ORDER_TYPE_OPTIONS } from "@/lib/Constant";
import {
  formatMoney,
  nameOption,
  plural,
  staffOption,
} from "@/lib/Functions/Common";
import { cn } from "@/lib/utils";
import { userData } from "@/lib/Variables";
import OrderConfirm from "./OrderConfirm";
import OrderSlip from "./OrderSlip";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE = 400;

const EMPTY_DETAILS = {
  orderType: "DINE_IN",
  tableNumber: "",
  customerName: "",
  note: "",
};

export default function NewOrder() {
  const navigate = useNavigate();
  const scope = useScope();
  const { user } = useAtomValue(userData);
  const notify = useNotify();
  const can = useCan();
  const outletId = scope.outletId;

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const [cart, setCart] = useState({});
  const [serverId, setServerId] = useState(null);
  const [ownServer, setOwnServer] = useState(null);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [slipOpen, setSlipOpen] = useState(false);

  const searchTimer = useRef(null);

  const menus = useRemoteOptions({
    url: API_LINK.Menu,
    params: { outletId },
    mapOption: nameOption,
    enabled: !!outletId,
    errorText: "Failed to load menus",
  });

  const servers = useRemoteOptions({
    url: API_LINK.Staff,
    params: { branchId: outletId, status: "ACTIVE", sort_by: "firstName" },
    mapOption: staffOption,
    selected: ownServer,
    enabled: !!outletId,
    errorText: "Failed to load staff",
  });

  useEffect(() => {
    if (!user?.staffId) return;
    ApiService.get(API_LINK.StaffDetails(user.staffId))
      .then((res) => {
        if (res.status === "success" && res.data?.status === "ACTIVE") {
          setOwnServer(staffOption(res.data));
          setServerId((current) => current ?? res.data.id);
        }
      })
      .catch(() => setOwnServer(null));
  }, [user?.staffId]);

  useEffect(() => {
    if (!outletId) return;
    setLoading(true);

    const request = ApiService.get(API_LINK.SalesOrderItems, {
      params: {
        branchId: outletId,
        page,
        per_page: PAGE_SIZE,
        search_by: query || undefined,
        menuId: menuId || undefined,
      },
    });

    notify
      .load(request, {
        errorText: "Failed to load items",
        onSuccess: (res) =>
          setItems((prev) => ({
            data:
              page === 1
                ? (res?.data ?? [])
                : [...prev.data, ...(res?.data ?? [])],
            total: res?.total ?? 0,
          })),
      })
      .finally(() => setLoading(false));
  }, [outletId, page, query, menuId, notify]);

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const handleSearch = (value) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setQuery(value.trim());
    }, SEARCH_DEBOUNCE);
  };

  const lines = useMemo(() => Object.values(cart), [cart]);
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totalAmount = lines.reduce(
    (sum, line) => sum + line.quantity * line.item.price,
    0,
  );

  const changeQuantity = useCallback((item, step) => {
    setCart((prev) => {
      const current = prev[item.id]?.quantity ?? 0;
      const quantity = Math.min(Math.max(current + step, 0), item.stock);
      const next = { ...prev };
      if (quantity) next[item.id] = { item, quantity };
      else delete next[item.id];
      return next;
    });
  }, []);

  const removeLine = (id) =>
    setCart((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const updateDetail = (field) => (value) =>
    setDetails((prev) => ({ ...prev, [field]: value }));

  function resetOrder() {
    setCart({});
    setDetails(EMPTY_DETAILS);
    setServerId(ownServer?.value ?? null);
  }

  function handleConfirmed(order) {
    setConfirmOpen(false);
    setPlacedOrder(order);
    resetOrder();
    setItems((prev) => ({
      ...prev,
      data: prev.data
        .map((item) => {
          const line = order.items?.find((row) => row.menuItemId === item.id);
          return line ? { ...item, stock: item.stock - line.quantity } : item;
        })
        .filter((item) => item.stock > 0),
    }));
  }

  const selectedServer = servers.options.find(
    (option) => option.value === serverId,
  );
  const canSubmit = !!outletId && !!serverId && lines.length > 0;
  const hasMore = items.data.length < items.total;

  if (!outletId) {
    return (
      <div className="page">
        <PageHeader
          title="New Order"
          subtitle="Orders can only be taken from an outlet account."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="New Order"
        subtitle={`Take a food & beverage order for ${scope.outletName ?? "this outlet"}`}
        actions={
          <AnimateButton
            variant="outline"
            preIcon={LuReceipt}
            label="Sales Orders"
            onClick={() => navigate("/outlet/order")}
          />
        }
      />

      <div className="pos">
        <section className="pos-menu">
          <div className="pos-toolbar">
            <InputField
              name="pos-search"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search items..."
              preIcon={LuSearch}
              className="pos-search"
            />
            <AutoCompleteField
              name="pos-menu"
              placeholder="All menus"
              options={menus.options}
              onSearch={menus.onSearch}
              loading={menus.loading}
              filterLocally={false}
              clearable
              value={menuId}
              onValueChange={(value) => {
                setPage(1);
                setMenuId(value ?? null);
              }}
              className="pos-filter"
            />
          </div>

          {loading && page === 1 ? (
            <div className="pos-grid">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-44 rounded-md" />
              ))}
            </div>
          ) : items.data.length ? (
            <div className="pos-grid">
              {items.data.map((item) => {
                const quantity = cart[item.id]?.quantity ?? 0;
                const maxed = quantity >= item.stock;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={maxed}
                    onClick={() => changeQuantity(item, 1)}
                    className={cn(
                      "pos-item",
                      quantity > 0 && "pos-item-active",
                    )}
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="pos-item-image"
                      />
                    ) : (
                      <span className="pos-item-image pos-item-image-empty">
                        {item.name.charAt(0)}
                      </span>
                    )}
                    {quantity > 0 && (
                      <span className="pos-item-qty">{quantity}</span>
                    )}
                    <span className="pos-item-body">
                      <span className="pos-item-name">{item.name}</span>
                      <span className="cell-sub">{item.menu?.name}</span>
                      <span className="pos-item-foot">
                        <span className="pos-item-price">
                          {formatMoney(item.price)}
                        </span>
                        <span
                          className={cn(
                            "pos-item-stock",
                            item.stock <= 5 && "pos-item-stock-low",
                          )}
                        >
                          {maxed
                            ? "Max added"
                            : `${item.stock - quantity} left`}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="pos-empty">
              {query || menuId
                ? "No stocked item matches your search."
                : "No item is in stock at this outlet."}
            </p>
          )}

          {hasMore && (
            <AnimateButton
              variant="outline"
              label="Load more items"
              loading={loading && page > 1}
              onClick={() => setPage((prev) => prev + 1)}
              className="pos-more"
            />
          )}
        </section>

        <aside className="pos-cart">
          <div className="pos-cart-head">
            <span className="pos-cart-title">
              <LuShoppingCart />
              Current Order
            </span>
            {lines.length > 0 && (
              <button
                type="button"
                className="pos-cart-clear"
                onClick={() => setCart({})}
              >
                <LuX />
                Clear
              </button>
            )}
          </div>

          <AutoCompleteField
            label="Server"
            placeholder="Search server"
            required
            options={servers.options}
            onSearch={servers.onSearch}
            loading={servers.loading}
            filterLocally={false}
            value={serverId}
            onValueChange={(value) => setServerId(value ?? null)}
            emptyMessage="No active staff found"
          />

          <CustomRadioField
            label="Order Type"
            options={ORDER_TYPE_OPTIONS}
            value={details.orderType}
            onValueChange={updateDetail("orderType")}
          />

          <div className="pos-cart-fields">
            {details.orderType === "DINE_IN" && (
              <InputField
                label="Table"
                placeholder="T-12"
                maxLength={30}
                value={details.tableNumber}
                onChange={(e) => updateDetail("tableNumber")(e.target.value)}
              />
            )}
            <InputField
              label="Customer"
              placeholder="Optional"
              maxLength={100}
              value={details.customerName}
              onChange={(e) => updateDetail("customerName")(e.target.value)}
            />
          </div>

          <div className="pos-lines">
            {lines.length ? (
              lines.map(({ item, quantity }) => (
                <div key={item.id} className="pos-line">
                  <div className="pos-line-info">
                    <span className="cell-title">{item.name}</span>
                    <span className="cell-sub">
                      {formatMoney(item.price)} each
                    </span>
                  </div>
                  <div className="pos-stepper">
                    <button
                      type="button"
                      aria-label={`Remove one ${item.name}`}
                      onClick={() => changeQuantity(item, -1)}
                    >
                      <LuMinus />
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      aria-label={`Add one ${item.name}`}
                      disabled={quantity >= item.stock}
                      onClick={() => changeQuantity(item, 1)}
                    >
                      <LuPlus />
                    </button>
                  </div>
                  <span className="pos-line-total">
                    {formatMoney(quantity * item.price)}
                  </span>
                  <button
                    type="button"
                    className="pos-line-remove"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeLine(item.id)}
                  >
                    <LuTrash2 />
                  </button>
                </div>
              ))
            ) : (
              <p className="pos-lines-empty">
                Tap items on the left to add them to the order.
              </p>
            )}
          </div>

          <CustomTextarea
            label="Note"
            placeholder="Kitchen note, allergies..."
            rows={2}
            maxLength={255}
            value={details.note}
            onChange={(e) => updateDetail("note")(e.target.value)}
          />

          <div className="pos-summary">
            <span>{plural(totalItems, "item")}</span>
            <span className="pos-summary-total">
              {formatMoney(totalAmount)}
            </span>
          </div>

          <AnimateButton
            fullWidth
            size="lg"
            label="Generate Order"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
          />
        </aside>
      </div>

      <OrderConfirm
        open={confirmOpen || (!!placedOrder && !slipOpen)}
        outletId={outletId}
        server={selectedServer}
        details={details}
        lines={lines}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={handleConfirmed}
        placedOrder={placedOrder}
        onSlip={can("orders.slip") ? () => setSlipOpen(true) : undefined}
        onDone={() => setPlacedOrder(null)}
      />

      <OrderSlip
        open={slipOpen}
        order={placedOrder}
        onClose={() => setSlipOpen(false)}
        onPrinted={(order) => setPlacedOrder(order)}
      />
    </div>
  );
}
