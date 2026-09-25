import React, { useEffect, useMemo, useState } from "react";
import {
  LuArrowDown,
  LuArrowUp,
  LuArrowUpDown,
  LuChevronLeft,
  LuChevronRight,
  LuPlus,
  LuRefreshCw,
  LuSearch,
} from "react-icons/lu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import AnimateButton from "./AnimateButton";
import CustomSelectField from "./CustomSelectField";
import InputField from "./InputField";

const getValue = (record, dataIndex) =>
  dataIndex
    ? String(dataIndex)
        .split(".")
        .reduce((acc, key) => (acc == null ? acc : acc[key]), record)
    : undefined;

const defaultSorter = (dataIndex) => (a, b) => {
  const x = getValue(a, dataIndex);
  const y = getValue(b, dataIndex);
  if (x == null) return 1;
  if (y == null) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  return String(x).localeCompare(String(y), undefined, { numeric: true });
};

export default function CustomTable({
  columns = [],
  dataSource = [],
  rowKey = "id",
  loading = false,
  emptyMessage = "No records found",
  title,
  description,
  actions,
  onAdd,
  addLabel = "Add new",
  onReload,
  showSearch = true,
  searchPlaceholder = "Search...",
  searchKeys,
  pagination = true,
  pageSizeOptions = [10, 20, 50],
  defaultPageSize = pageSizeOptions[0],
  onRowClick,
  total,
  page: pageProp,
  pageSize: pageSizeProp,
  onPageChange,
  onPageSizeChange,
  searchValue,
  onSearchChange,
  className,
}) {
  const serverSide = !!onPageChange;
  const [localSearch, setLocalSearch] = useState("");
  const [sort, setSort] = useState(null);
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);

  const search = searchValue ?? localSearch;
  const page = serverSide ? pageProp ?? 1 : localPage;
  const pageSize = serverSide ? pageSizeProp ?? defaultPageSize : localPageSize;

  const setSearch = (value) => {
    if (onSearchChange) onSearchChange(value);
    else setLocalSearch(value);
  };
  const setPage = (next) => {
    const value = typeof next === "function" ? next(page) : next;
    if (serverSide) onPageChange(value);
    else setLocalPage(value);
  };
  const setPageSize = (size) => {
    if (serverSide) onPageSizeChange?.(size);
    else setLocalPageSize(size);
  };

  const keys = useMemo(
    () => searchKeys ?? columns.map((col) => col.dataIndex).filter(Boolean),
    [searchKeys, columns],
  );

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (serverSide || !keyword) return dataSource;
    return dataSource.filter((record) =>
      keys.some((key) => String(getValue(record, key) ?? "").toLowerCase().includes(keyword)),
    );
  }, [dataSource, keys, search, serverSide]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((col) => col.key === sort.key);
    if (!column) return filtered;
    const sorter = column.sorter ?? defaultSorter(column.dataIndex);
    const list = [...filtered].sort(sorter);
    return sort.direction === "desc" ? list.reverse() : list;
  }, [filtered, sort, columns]);

  const totalRows = serverSide ? total ?? dataSource.length : sorted.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const start = pagination ? (page - 1) * pageSize : 0;
  const rows = pagination && !serverSide ? sorted.slice(start, start + pageSize) : sorted;

  useEffect(() => {
    if (!serverSide && localPage > totalPages) setLocalPage(totalPages);
  }, [serverSide, localPage, totalPages]);

  const toggleSort = (key) =>
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });

  const resolveKey = (record, index) =>
    typeof rowKey === "function" ? rowKey(record, index) : record[rowKey] ?? index;

  const hasToolbar = title || description || actions || onAdd || onReload || showSearch;

  return (
    <div className={cn("table-card", className)}>
      {hasToolbar && (
        <div className="table-toolbar">
          {(title || description) && (
            <div className="table-heading">
              {title && <h2 className="table-title">{title}</h2>}
              {description && <p className="table-description">{description}</p>}
            </div>
          )}
          <div className="table-tools">
            {showSearch && (
              <InputField
                name="table-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (!serverSide) setPage(1);
                }}
                placeholder={searchPlaceholder}
                preIcon={LuSearch}
                className="table-search"
              />
            )}
            {actions}
            {onReload && (
              <AnimateButton
                variant="outline"
                size="icon"
                aria-label="Reload"
                preIcon={LuRefreshCw}
                onClick={onReload}
                disabled={loading}
              />
            )}
            {onAdd && <AnimateButton preIcon={LuPlus} label={addLabel} onClick={onAdd} />}
          </div>
        </div>
      )}

      <div className="table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const SortIcon = active ? (sort.direction === "asc" ? LuArrowUp : LuArrowDown) : LuArrowUpDown;
                return (
                  <TableHead
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn("table-head", col.align && `table-align-${col.align}`, col.className)}
                  >
                    {col.sortable ? (
                      <button type="button" onClick={() => toggleSort(col.key)} className="table-sort">
                        {col.title}
                        <SortIcon className={cn("table-sort-icon", active && "table-sort-icon-active")} />
                      </button>
                    ) : (
                      col.title
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 5) }, (_, i) => (
                <TableRow key={`loading-${i}`}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      <Skeleton className="table-skeleton" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length ? (
              rows.map((record, index) => (
                <TableRow
                  key={resolveKey(record, start + index)}
                  onClick={onRowClick ? () => onRowClick(record) : undefined}
                  className={cn(onRowClick && "table-row-action")}
                >
                  {columns.map((col) => {
                    const value = getValue(record, col.dataIndex);
                    return (
                      <TableCell
                        key={col.key}
                        className={cn("table-cell", col.align && `table-align-${col.align}`, col.className)}
                      >
                        {col.render ? col.render(value, record, start + index) : value ?? "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="table-empty">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalRows > 0 && (
        <div className="table-footer">
          <p className="table-count">
            Showing {start + 1}–{Math.min(start + rows.length, totalRows)} of {totalRows}
          </p>
          <div className="table-pager">
            <CustomSelectField
              name="page-size"
              value={pageSize}
              options={pageSizeOptions.map((n) => ({ label: `${n} / page`, value: n }))}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
              className="table-page-size"
              inputClassName="table-page-size-trigger"
            />
            <AnimateButton
              variant="outline"
              size="icon"
              aria-label="Previous page"
              preIcon={LuChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="table-page-btn"
            />
            <span className="table-page-label">
              {page} / {totalPages}
            </span>
            <AnimateButton
              variant="outline"
              size="icon"
              aria-label="Next page"
              preIcon={LuChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="table-page-btn"
            />
          </div>
        </div>
      )}
    </div>
  );
}
