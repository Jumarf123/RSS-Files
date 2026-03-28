import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize: () => number;
  }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        size: estimateSize(),
        start: index * estimateSize(),
      })),
    measure: () => {},
  }),
}));

import { ResultsTable } from "./results-table";
import type { ArtifactSummary } from "@/shared/types/api";

const artifact: ArtifactSummary = {
  id: "artifact-1",
  scan_id: "scan-1",
  source_id: "source-1",
  name: "payload.exe",
  original_path: "C:\\Users\\Public\\payload.exe",
  extension: "exe",
  family: "executable",
  kind: "exe",
  origin_type: "filesystem_deleted_entry",
  confidence: "high",
  recoverability: "good",
  deleted_entry: true,
  size: 2048,
  priority_score: 100,
  filesystem_record: 42,
  raw_offset: 4096,
  raw_length: 2048,
  created_at: null,
  modified_at: null,
};

describe("ResultsTable", () => {
  it("renders deleted artifacts and forwards inspect clicks", async () => {
    const onInspect = vi.fn();

    render(
      <ResultsTable
        artifacts={[artifact]}
        onInspect={onInspect}
        onToggleSelected={() => {}}
        selectedArtifactId={null}
        selectedIds={new Set()}
      />,
    );

    expect(await screen.findByText("payload.exe")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Good")).toBeInTheDocument();

    fireEvent.click(screen.getByText("payload.exe"));
    expect(onInspect).toHaveBeenCalledWith(artifact);
  });
});
