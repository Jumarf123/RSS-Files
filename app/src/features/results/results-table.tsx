import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Database, File, FileArchive, FileCode2, FileCog, FileImage, FileText, Package2, ShieldQuestion } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatBytes, formatDate, titleCase } from "@/shared/lib/format";
import type { ArtifactFamily, ArtifactSummary } from "@/shared/types/api";

const columnHelper = createColumnHelper<ArtifactSummary>();
const ROW_HEIGHT = 40;

interface ResultsTableProps {
  artifacts: ArtifactSummary[];
  selectedArtifactId: string | null;
  selectedIds: Set<string>;
  onInspect: (artifact: ArtifactSummary) => void;
  onToggleSelected: (artifactId: string, checked: boolean) => void;
}

export function ResultsTable({
  artifacts,
  selectedArtifactId,
  selectedIds,
  onInspect,
  onToggleSelected,
}: ResultsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [viewportWidth, setViewportWidth] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => <span className="sr-only">Select</span>,
        size: 34,
        cell: ({ row }) => (
          <input
            checked={selectedIds.has(row.original.id)}
            className="size-3.5 accent-[#5865f2]"
            onChange={(event) => onToggleSelected(row.original.id, event.target.checked)}
            onClick={(event) => event.stopPropagation()}
            type="checkbox"
          />
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        size: 240,
        cell: ({ row, getValue }) => (
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-slate-400">{familyIcon(row.original.family)}</span>
            <div className="truncate font-medium text-slate-100" title={getValue()}>
              {getValue()}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.original_path ?? "", {
        id: "path",
        header: "Path",
        size: 320,
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="block truncate text-slate-400" title={getValue()}>
              {getValue()}
            </span>
          ) : (
            <span className="text-slate-600">carved</span>
          ),
      }),
      columnHelper.accessor("kind", {
        header: "Type",
        size: 86,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-slate-400">{titleCase(getValue())}</span>,
      }),
      columnHelper.accessor("size", {
        header: "Size",
        size: 92,
        cell: ({ getValue }) => <span className="whitespace-nowrap font-mono text-[12px] text-slate-300">{formatBytes(getValue())}</span>,
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        size: 160,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-slate-400">{formatDate(getValue())}</span>,
      }),
      columnHelper.accessor("modified_at", {
        header: "Modified",
        size: 160,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-slate-400">{formatDate(getValue())}</span>,
      }),
      columnHelper.accessor("confidence", {
        header: "Confidence",
        size: 90,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-slate-400">{titleCase(getValue())}</span>,
      }),
      columnHelper.accessor("recoverability", {
        header: "Recovery",
        size: 90,
        cell: ({ getValue }) => <span className="whitespace-nowrap text-slate-400">{titleCase(getValue())}</span>,
      }),
      columnHelper.display({
        id: "record",
        header: "Record / Offset",
        size: 180,
        cell: ({ row }) => {
          const record = row.original.filesystem_record;
          const offset = row.original.raw_offset;
          if (record != null) {
            return <span className="whitespace-nowrap font-mono text-[12px] text-slate-400">{record}</span>;
          }
          if (offset != null) {
            return <span className="whitespace-nowrap font-mono text-[12px] text-slate-400">{`0x${offset.toString(16)}`}</span>;
          }
          return <span className="text-slate-600">-</span>;
        },
      }),
    ],
    [onToggleSelected, selectedIds],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: artifacts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 18,
  });
  const leafColumns = table.getVisibleLeafColumns();
  const totalWidth = leafColumns.reduce((sum, column) => sum + column.getSize(), 0);
  const effectiveWidth = Math.max(totalWidth, viewportWidth);
  const lastColumnIndex = Math.max(leafColumns.length - 1, 0);
  const gridTemplateColumns = leafColumns
    .map((column, index) =>
      index === lastColumnIndex ? `minmax(${column.getSize()}px, 1fr)` : `${column.getSize()}px`,
    )
    .join(" ");

  useEffect(() => {
    if (!scrollRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      setViewportWidth(scrollRef.current?.clientWidth ?? 0);
      rowVirtualizer.measure();
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [rowVirtualizer]);

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rows.length, rowVirtualizer, viewportWidth]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#101114]">
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain" data-testid="deleted-results" ref={scrollRef}>
        <div style={{ minWidth: "100%", width: `${effectiveWidth}px` }}>
          <div className="sticky top-0 z-10 border-b border-white/6 bg-[#14161a] shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <div className="grid" key={headerGroup.id} style={{ gridTemplateColumns }}>
                {headerGroup.headers.map((header) => (
                  <div
                    className="flex h-10 items-center px-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
                    key={header.id}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex items-center gap-1 text-inherit"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {rows.length > 0 ? (
            <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    className={
                      row.original.id === selectedArtifactId
                        ? "absolute left-0 top-0 grid border-b border-white/6 bg-[#1d2026]"
                        : "absolute left-0 top-0 grid border-b border-white/6 text-slate-300 hover:bg-white/[0.03]"
                    }
                    data-testid="deleted-results-row"
                    key={row.id}
                    onClick={() => onInspect(row.original)}
                    style={{
                      gridTemplateColumns,
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: "100%",
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div className="flex h-full items-center overflow-hidden px-3 text-[13px] leading-5" key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-4 text-sm text-slate-500">No deleted artifacts in the current view.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function familyIcon(family: ArtifactFamily) {
  switch (family) {
    case "archive":
      return <FileArchive className="size-4" />;
    case "executable":
      return <FileCode2 className="size-4" />;
    case "script":
      return <FileCode2 className="size-4" />;
    case "database":
      return <Database className="size-4" />;
    case "document":
      return <FileText className="size-4" />;
    case "image":
      return <FileImage className="size-4" />;
    case "config":
      return <FileCog className="size-4" />;
    case "text":
      return <FileText className="size-4" />;
    case "container":
      return <Package2 className="size-4" />;
    case "binary":
      return <File className="size-4" />;
    default:
      return <ShieldQuestion className="size-4" />;
  }
}
