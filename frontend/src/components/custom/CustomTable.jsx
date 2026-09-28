import React, { useEffect, useMemo, useRef, useState } from "react";
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
import AutoCompleteField from "./AutoCompleteField";
import CustomSelectField from "./CustomSelectField";
import InputField from "./InputField";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

const getValue = (record, dataIndex) =>
  dataIndex
    ? String(dataIndex)
        .split(".")
        .reduce((acc, key) => (acc == null ? acc : acc[key]), record)
    : undefined;

const getSearchableText = (value) => {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
};

const compareValues = (x, y) => {
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
  emptyText = "No records found",
  title,
  description,
  actions,
  onAdd,
  addLabel = "Add new",
  showReload = true,
  reloadAction,
  showSearch = true,
  searchPlaceholder = "Search...",
  onSearch,
  filterOptions,
  filterPlaceholder = "All",
  defaultFilter = "all",
  onFilterSearch,
  filterLoading = false,
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  total,
  onChange,
  onRowClick,
  className,
}) {
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilterValue, setActiveFilterValue] = useState(defaultFilter || "all");

  const serverDriven = total != null;

  const activeFilterOption = useMemo(
    () => filterOptions?.find((option) => option.value === activeFilterValue),
    [filterOptions, activeFilterValue],
  );

  const filteredData = useMemo(() => {
    const predicate = activeFilterOption?.predicate;
    if (serverDriven || !predicate) return dataSource;
    return dataSource.filter(predicate);
  }, [dataSource, activeFilterOption, serverDriven]);

  const searchedData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (serverDriven || !query) return filteredData;
    return filteredData.filter((record) =>
      columns.some((column) => {
        if (!column.dataIndex) return false;
        const text = getSearchableText(getValue(record, column.dataIndex));
        return text !== null && text.toLowerCase().includes(query);
      }),
    );
  }, [filteredData, searchQuery, columns, serverDriven]);

  const sortedData = useMemo(() => {
    if (serverDriven || !sort) return searchedData;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return searchedData;

    const data = [...searchedData];
    data.sort((a, b) => {
      const result = column.sorter
        ? column.sorter(a, b)
        : compareValues(getValue(a, column.dataIndex), getValue(b, column.dataIndex));
      return sort.direction === "asc" ? result : -result;
    });
    return data;
  }, [searchedData, sort, columns, serverDriven]);

  const totalRows = total ?? sortedData.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    if (serverDriven || !pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, serverDriven, pagination]);

  const startIndex = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRows);

  const handleSort = (column) => {
    setSort((prev) => {
      if (!prev || prev.key !== column.key) return { key: column.key, direction: "asc" };
      if (prev.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
    setPage(1);
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    setPage(1);
    onSearch?.(value);
  };

  const handleFilter = (value) => {
    setActiveFilterValue(value ?? "all");
    setPage(1);
  };

  const onChangeRef = useRef(onChange);
  const columnsRef = useRef(columns);

  useEffect(() => {
    onChangeRef.current = onChange;
    columnsRef.current = columns;
  });

  const isInitialChange = useRef(true);
  useEffect(() => {
    if (isInitialChange.current) {
      isInitialChange.current = false;
      return;
    }
    const column = sort ? columnsRef.current.find((c) => c.key === sort.key) : null;
    const sortField = column
      ? column.sortKey ?? (column.dataIndex ? String(column.dataIndex) : null)
      : null;

    onChangeRef.current?.({
      page: currentPage,
      pageSize,
      sort,
      sortField,
      filter: activeFilterValue === "all" ? null : activeFilterValue,
    });
  }, [currentPage, pageSize, sort, activeFilterValue]);

  const resolveKey = (record, index) =>
    typeof rowKey === "function" ? rowKey(record, index) : record[rowKey] ?? index;

  const remoteFilter = !!onFilterSearch;
  const showFilters = remoteFilter ? !!filterOptions : !!filterOptions?.length;
  const hasToolbar =
    title || description || actions || onAdd || (showReload && reloadAction) || showSearch || showFilters;

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
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                preIcon={LuSearch}
                className="table-search"
              />
            )}
            {showFilters && remoteFilter && (
              <AutoCompleteField
                name="table-filter"
                placeholder={filterPlaceholder}
                options={filterOptions}
                value={activeFilterValue === "all" ? null : activeFilterValue}
                onValueChange={handleFilter}
                onSearch={onFilterSearch}
                loading={filterLoading}
                filterLocally={false}
                clearable
                className="table-filter"
              />
            )}
            {showFilters && !remoteFilter && (
              <CustomSelectField
                name="table-filter"
                placeholder={filterPlaceholder}
                options={[{ label: filterPlaceholder, value: "all" }, ...filterOptions]}
                value={activeFilterValue}
                onValueChange={handleFilter}
                className="table-filter"
              />
            )}
            {actions}
            {showReload && reloadAction && (
              <AnimateButton
                variant="outline"
                size="icon"
                aria-label="Reload"
                preIcon={LuRefreshCw}
                onClick={reloadAction}
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
                const SortIcon = active
                  ? sort.direction === "asc"
                    ? LuArrowUp
                    : LuArrowDown
                  : LuArrowUpDown;
                return (
                  <TableHead
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn("table-head", col.align && `table-align-${col.align}`, col.className)}
                  >
                    {col.sortable ? (
                      <button type="button" onClick={() => handleSort(col)} className="table-sort">
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
            ) : paginatedData.length ? (
              paginatedData.map((record, index) => (
                <TableRow
                  key={resolveKey(record, index)}
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
                        {col.render ? col.render(value, record, index) : value ?? "—"}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="table-empty">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalRows > 0 && (
        <div className="table-footer">
          <p className="table-count">
            Showing {startIndex}–{endIndex} of {totalRows}
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
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="table-page-btn"
            />
            <span className="table-page-label">
              {currentPage} / {totalPages}
            </span>
            <AnimateButton
              variant="outline"
              size="icon"
              aria-label="Next page"
              preIcon={LuChevronRight}
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="table-page-btn"
            />
          </div>
        </div>
      )}
    </div>
  );
}
