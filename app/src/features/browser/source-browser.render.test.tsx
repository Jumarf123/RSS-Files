import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
    getItemKey,
  }: {
    count: number;
    estimateSize: () => number;
    getItemKey?: (index: number) => string | number;
  }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: getItemKey ? getItemKey(index) : index,
        size: estimateSize(),
        start: index * estimateSize(),
      })),
    measure: () => {},
    scrollToOffset: () => {},
  }),
}));

import { SourceBrowser } from "./source-browser";
import type { BrowseSourceRequest, ScanSource, SourceDirectoryListing, SourceEntry } from "@/shared/types/api";

const source: ScanSource = {
  id: "vol-c",
  kind: "logical_volume",
  device_path: "\\\\.\\C:",
  mount_point: "C:\\",
  display_name: "System C:",
  volume_label: "Windows",
  filesystem: "ntfs",
  volume_serial: 1,
  total_bytes: 1024,
  free_bytes: 512,
  cluster_size: 4096,
  is_system: true,
  requires_elevation: true,
};

function entry(path: string, options?: Partial<SourceEntry>): SourceEntry {
  const name = path.split("\\").at(-1) ?? path;
  const isDirectory = options?.is_directory ?? true;
  return {
    name,
    path,
    parent_path: path.includes("\\") ? path.slice(0, path.lastIndexOf("\\")) || "C:\\" : "C:\\",
    mft_reference: null,
    parent_reference: null,
    extension: isDirectory ? null : name.split(".").at(-1) ?? null,
    is_directory: isDirectory,
    has_children: isDirectory,
    is_metafile: false,
    entry_class: isDirectory ? "directory" : "file",
    size: options?.size ?? 0,
    created_at: null,
    modified_at: null,
    accessed_at: null,
    hidden: false,
    system: false,
    read_only: false,
    attr_bits: 0x0020,
    attributes: [],
    deleted_hits: 0,
    access_state: "available",
    ...options,
  };
}

function listing(path: string, entries: SourceEntry[], parentPath: string | null): SourceDirectoryListing {
  return {
    source_id: source.id,
    root_path: "C:\\",
    path,
    parent_path: parentPath,
    entries,
    deleted_artifacts: [],
    total_entry_count: entries.length,
    deleted_artifact_count: 0,
    next_cursor: null,
    deleted_artifact_next_cursor: null,
    indexing_complete: true,
    indexed_entries: entries.length,
    total_estimated_entries: entries.length,
    index_generation: 1,
    deleted_subtree_count: 0,
  };
}

describe("SourceBrowser rendering stability", () => {
  it("does not clear the whole browser cache when only the active path changes", async () => {
    const requests: BrowseSourceRequest[] = [];
    const listings = new Map<string, SourceDirectoryListing>([
      ["C:\\::dirs", listing("C:\\", [entry("C:\\Users"), entry("C:\\Windows")], null)],
      ["C:\\::all", listing("C:\\", [entry("C:\\Users"), entry("C:\\Windows")], null)],
      [
        "C:\\Users::dirs",
        listing("C:\\Users", [entry("C:\\Users\\Downloads"), entry("C:\\Users\\Desktop")], "C:\\"),
      ],
      [
        "C:\\Users::all",
        listing("C:\\Users", [entry("C:\\Users\\Downloads"), entry("C:\\Users\\Desktop")], "C:\\"),
      ],
      [
        "C:\\Users\\Downloads::dirs",
        listing("C:\\Users\\Downloads", [], "C:\\Users"),
      ],
      [
        "C:\\Users\\Downloads::all",
        listing("C:\\Users\\Downloads", [entry("C:\\Users\\Downloads\\alpha.txt", { is_directory: false, size: 32 })], "C:\\Users"),
      ],
      [
        "C:\\Users\\Desktop::dirs",
        listing("C:\\Users\\Desktop", [], "C:\\Users"),
      ],
      [
        "C:\\Users\\Desktop::all",
        listing("C:\\Users\\Desktop", [entry("C:\\Users\\Desktop\\beta.txt", { is_directory: false, size: 64 })], "C:\\Users"),
      ],
    ]);

    const loadDirectory = vi.fn(async (request: BrowseSourceRequest) => {
      requests.push(request);
      const key = `${request.path ?? source.mount_point}::${request.directories_only ? "dirs" : "all"}`;
      const resolved = listings.get(key);
      if (!resolved) {
        throw new Error(`Missing mock listing for ${key}`);
      }
      return structuredClone(resolved);
    });

    function Harness() {
      const [activePath, setActivePath] = useState<string | null>("C:\\");
      return (
        <div>
          <button onClick={() => setActivePath("C:\\Users")} type="button">
            Switch Users
          </button>
          <button onClick={() => setActivePath("C:\\Users\\Downloads")} type="button">
            Switch Downloads
          </button>
          <button onClick={() => setActivePath("C:\\Users\\Desktop")} type="button">
            Switch Desktop
          </button>
          <SourceBrowser
            activePath={activePath}
            filterText=""
            leftPaneWidth={320}
            loadDirectory={loadDirectory}
            onInspectArtifact={() => {}}
            onResizePointerDown={() => {}}
            onSelectEntry={() => {}}
            onSelectPath={setActivePath}
            refreshToken={0}
            selectedArtifactId={null}
            selectedEntryPath={null}
            source={source}
          />
        </div>
      );
    }

    render(<Harness />);

    expect(await screen.findAllByText("Windows")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Switch Users" }));
    expect(await screen.findByText("Downloads")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch Downloads" }));
    expect(await screen.findByText("alpha.txt")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch Desktop" }));
    expect(await screen.findByText("beta.txt")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("alpha.txt")).not.toBeInTheDocument());

    expect(requests.filter((request) => (request.path ?? "C:\\") === "C:\\" && request.directories_only === true)).toHaveLength(1);
    expect(requests.filter((request) => (request.path ?? "C:\\") === "C:\\" && !request.directories_only)).toHaveLength(1);
  });
});
