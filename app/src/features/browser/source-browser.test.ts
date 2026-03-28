import { describe, expect, it } from "vitest";

import { buildDeletedIndex, normalizeBrowserPath, parentDirectoryPath } from "./source-browser-index";
import type { ArtifactSummary } from "@/shared/types/api";

function deletedArtifact(id: string, originalPath: string | null): ArtifactSummary {
  return {
    id,
    scan_id: "scan-1",
    source_id: "source-1",
    name: `${id}.bin`,
    original_path: originalPath,
    extension: originalPath?.split(".").pop() ?? null,
    family: "binary",
    kind: "bin",
    origin_type: "filesystem_deleted_entry",
    confidence: "medium",
    recoverability: "partial",
    deleted_entry: true,
    size: 1024,
    priority_score: 20,
    filesystem_record: null,
    raw_offset: null,
    raw_length: null,
    created_at: null,
    modified_at: null,
  };
}

describe("buildDeletedIndex", () => {
  it("tracks subtree counts and subtree artifacts for opened folders", () => {
    const artifacts = [
      deletedArtifact("a", "C:\\Cases\\alpha\\one.txt"),
      deletedArtifact("b", "C:\\Cases\\alpha\\nested\\two.txt"),
      deletedArtifact("c", "C:\\Cases\\beta\\three.txt"),
      deletedArtifact("unknown", null),
    ];

    const index = buildDeletedIndex(artifacts, "C:\\");

    expect(index.directFolderCounts.get("c:\\cases\\alpha")).toBe(1);
    expect(index.directFolderCounts.get("c:\\cases\\alpha\\nested")).toBe(1);
    expect(index.subtreeFolderCounts.get("c:\\cases")).toBe(3);
    expect(index.subtreeFolderCounts.get("c:\\cases\\alpha")).toBe(2);
    expect(index.subtreeFolderCounts.get("c:\\cases\\alpha\\nested")).toBe(1);

    expect(index.directArtifactsByFolder.get("c:\\cases\\alpha")).toHaveLength(1);
    expect(index.syntheticFoldersByParent.get("c:\\cases\\alpha")?.map((folder) => folder.name)).toEqual(["nested"]);
    expect(index.syntheticFoldersByParent.get("c:\\")?.map((folder) => folder.name.toLowerCase())).toContain("cases");
    expect(index.unknownArtifacts).toHaveLength(1);
  });

  it("normalizes forward-slash paths into the correct parent folder buckets", () => {
    const artifacts = [
      deletedArtifact("a", "C:/Users/jumarf/Documents/demo/one.txt"),
      deletedArtifact("b", "c:\\users\\jumarf\\documents\\demo\\nested\\two.txt"),
    ];

    const index = buildDeletedIndex(artifacts, "C:\\");

    expect(index.directFolderCounts.get(normalizeBrowserPath("C:\\Users\\jumarf\\Documents\\demo"))).toBe(1);
    expect(index.directFolderCounts.get(normalizeBrowserPath("C:\\Users\\jumarf\\Documents\\demo\\nested"))).toBe(1);
    expect(index.syntheticFoldersByParent.get(normalizeBrowserPath("C:\\Users\\jumarf\\Documents\\demo"))?.map((folder) => folder.name)).toEqual(["nested"]);
  });

  it("never walks parent resolution above the mounted root", () => {
    expect(parentDirectoryPath("C:\\Windows\\System32", "C:\\")).toBe("C:\\Windows");
    expect(parentDirectoryPath("C:\\Windows", "C:\\")).toBe("C:\\");
    expect(parentDirectoryPath("C:\\", "C:\\")).toBe("C:\\");
  });
});
