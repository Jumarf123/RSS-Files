import { AlertTriangle, FolderInput, HardDriveDownload, ShieldAlert, ShieldCheck } from "lucide-react";

import { formatBytes, formatDate, titleCase } from "@/shared/lib/format";
import type {
  ArtifactPreviewMode,
  ContentPreviewResponse,
  ArtifactRecord,
  ArtifactSignatureSummary,
  PreviewFact,
  SourceEntryDetails,
} from "@/shared/types/api";

interface InspectorProps {
  artifact: ArtifactRecord | null;
  entry: SourceEntryDetails | null;
  signature: ArtifactSignatureSummary | null;
  signatureRequested: boolean;
  signaturePending: boolean;
  onRequestSignature: () => void;
}

export function Inspector({
  artifact,
  entry,
  signature,
  signatureRequested,
  signaturePending,
  onRequestSignature,
}: InspectorProps) {
  if (artifact) {
    const storage = artifactStorage(artifact);
    const artifactPathLabel = artifact.deleted_entry ? "Deleted artifact" : artifact.original_path ?? "Original path unavailable";
    return (
      <div className="space-y-5">
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected artifact</div>
          <div className="mt-2 truncate text-base font-semibold text-white" title={artifact.name}>
            {artifact.name}
          </div>
          <div
            className="mt-1 truncate text-sm text-slate-400"
            title={artifactPathLabel}
          >
            {artifactPathLabel}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailFact label="Type" value={titleCase(artifact.kind)} />
          <DetailFact label="Family" value={titleCase(artifact.family)} />
          <DetailFact label="Size" value={formatBytes(artifact.size)} />
          <DetailFact label="Confidence" value={titleCase(artifact.confidence)} />
          <DetailFact label="Recoverability" value={titleCase(artifact.recoverability)} />
          <DetailFact label="Origin" value={titleCase(artifact.origin_type)} />
          <DetailFact label="Created" value={formatDate(artifact.created_at)} />
          <DetailFact label="Modified" value={formatDate(artifact.modified_at)} />
          <DetailFact label="Record" value={artifact.filesystem_record?.toString() ?? "n/a"} />
          <DetailFact label="Offset" value={artifact.raw_offset != null ? `0x${artifact.raw_offset.toString(16)}` : "n/a"} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <ShieldCheck className="size-4 text-slate-400" />
            Signature
          </div>
          <div className="rounded-md border border-white/8 bg-[#111318] p-3 text-sm text-slate-300">
            {!signatureRequested ? (
              <div className="flex items-center justify-between gap-3">
                <div className="text-slate-400">Load signature verification on demand.</div>
                <button
                  className="rounded border border-white/8 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white"
                  onClick={onRequestSignature}
                  type="button"
                >
                  Load signature
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-200">{signaturePending ? "Verifying signature…" : signatureStatusLabel(signature)}</div>
                  <span className={signatureStatusClass(signature)}>
                    {signaturePending ? "loading" : signature?.status.replaceAll("_", " ") ?? "loading"}
                  </span>
                </div>
                {signature?.subject ? (
                  <div className="mt-2 truncate text-slate-400" title={signature.subject}>
                    Subject: {signature.subject}
                  </div>
                ) : null}
                {signature?.issuer ? (
                  <div className="mt-1 truncate text-slate-400" title={signature.issuer}>
                    Issuer: {signature.issuer}
                  </div>
                ) : null}
                <div
                  className="mt-1 truncate text-slate-500"
                  title={signature?.verification_source ?? "pending"}
                >
                  Source: {signature?.verification_source ?? "pending"}
                </div>
                {signature?.note ? <div className="mt-2 text-amber-300">{signature.note}</div> : null}
              </>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <HardDriveDownload className="size-4 text-slate-400" />
            Storage
          </div>
          <div className="rounded-md border border-white/8 bg-[#111318] p-3 text-sm text-slate-300">
            <div>{storage.kind}</div>
            <div className="mt-1 text-slate-400">Logical size: {formatBytes(storage.logicalSize)}</div>
            {storage.runCount != null ? <div className="mt-1 text-slate-400">Runs: {storage.runCount}</div> : null}
            {storage.sourcePath ? (
              <div className="mt-1 truncate text-slate-500" title={storage.sourcePath}>
                {storage.sourcePath}
              </div>
            ) : null}
            {storage.note ? <div className="mt-2 text-amber-300">{storage.note}</div> : null}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <FolderInput className="size-4 text-slate-400" />
            Facts
          </div>
          <div className="space-y-2">
            {artifact.preview.length > 0 ? (
              artifact.preview.map((fact) => <PreviewFactCard fact={fact} key={`${artifact.id}-${fact.label}`} />)
            ) : (
              <div className="text-sm text-slate-500">No artifact facts available.</div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <ShieldAlert className="size-4 text-slate-400" />
            Notes
          </div>
          <div className="space-y-2">
            {artifact.notes.length > 0 ? (
              artifact.notes.map((note) => (
                <div className="flex gap-2 rounded-md border border-white/8 bg-[#111318] px-3 py-2 text-sm text-slate-200" key={note}>
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
                  <span>{note}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">No notes.</div>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (entry) {
    const sourceEntry = entry.entry;
    return (
      <div className="space-y-5">
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected item</div>
          <div className="mt-2 truncate text-base font-semibold text-white" title={sourceEntry.name}>
            {sourceEntry.name}
          </div>
          <div className="mt-1 truncate text-sm text-slate-400" title={sourceEntry.path}>
            {sourceEntry.path}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailFact label="Type" value={sourceEntry.is_directory ? "Folder" : sourceEntry.extension?.toUpperCase() ?? "File"} />
          <DetailFact label="Class" value={titleCase(sourceEntry.entry_class)} />
          <DetailFact label="Size" value={sourceEntry.is_directory ? "-" : formatBytes(sourceEntry.size)} />
          <DetailFact label="Created" value={formatDate(sourceEntry.created_at)} />
          <DetailFact label="Modified" value={formatDate(sourceEntry.modified_at)} />
          <DetailFact label="Accessed" value={formatDate(sourceEntry.accessed_at)} />
          <DetailFact label="Deleted hits" value={sourceEntry.deleted_hits.toString()} />
          <DetailFact label="Access" value={titleCase(sourceEntry.access_state)} />
          <DetailFact label="MFT Record" value={sourceEntry.mft_reference?.toString() ?? "n/a"} />
          <DetailFact label="Parent Record" value={sourceEntry.parent_reference?.toString() ?? "n/a"} />
          <DetailFact label="ATTR Bits" value={sourceEntry.attr_bits != null ? `0x${sourceEntry.attr_bits.toString(16).padStart(4, "0")}` : "n/a"} />
          <DetailFact label="Attributes" value={sourceEntry.attributes.length > 0 ? sourceEntry.attributes.join(", ") : "-"} />
        </section>

        {!sourceEntry.is_directory ? (
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <ShieldCheck className="size-4 text-slate-400" />
              Signature
            </div>
            <div className="rounded-md border border-white/8 bg-[#111318] p-3 text-sm text-slate-300">
              {!signatureRequested ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-400">Load signature verification on demand.</div>
                  <button
                    className="rounded border border-white/8 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-white"
                    onClick={onRequestSignature}
                    type="button"
                  >
                    Load signature
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-slate-200">{signaturePending ? "Verifying signature…" : signatureStatusLabel(signature)}</div>
                    <span className={signatureStatusClass(signature)}>
                      {signaturePending ? "loading" : signature?.status.replaceAll("_", " ") ?? "loading"}
                    </span>
                  </div>
                  {signature?.subject ? (
                    <div className="mt-2 truncate text-slate-400" title={signature.subject}>
                      Subject: {signature.subject}
                    </div>
                  ) : null}
                  {signature?.issuer ? (
                    <div className="mt-1 truncate text-slate-400" title={signature.issuer}>
                      Issuer: {signature.issuer}
                    </div>
                  ) : null}
                  <div
                    className="mt-1 truncate text-slate-500"
                    title={signature?.verification_source ?? "pending"}
                  >
                    Source: {signature?.verification_source ?? "pending"}
                  </div>
                  {signature?.note ? <div className="mt-2 text-amber-300">{signature.note}</div> : null}
                </>
              )}
            </div>
          </section>
        ) : null}

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <FolderInput className="size-4 text-slate-400" />
            Notes
          </div>
          <div className="rounded-md border border-white/8 bg-[#111318] p-3 text-sm text-slate-300">
            {entry.notes.length > 0 ? entry.notes.join(" ") : "Live entry metadata loaded."}
          </div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <FolderInput className="size-4 text-slate-400" />
            Facts
          </div>
          <div className="space-y-2">
            {entry.summary.length > 0 ? (
              entry.summary.map((fact) => <PreviewFactCard fact={fact} key={`${sourceEntry.path}-${fact.label}`} />)
            ) : (
              <div className="text-sm text-slate-500">No entry facts available.</div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return <div className="flex h-full items-center justify-center text-sm text-slate-500">Select a folder entry or deleted artifact.</div>;
}

export function PreviewPane({
  artifact,
  entry,
  preview,
  loading,
  error,
  mode,
  onChangeMode,
  onNavigate,
}: {
  artifact: ArtifactRecord | null;
  entry: SourceEntryDetails["entry"] | null;
  preview: ContentPreviewResponse | null;
  loading: boolean;
  error: string | null;
  mode: ArtifactPreviewMode;
  onChangeMode: (mode: ArtifactPreviewMode) => void;
  onNavigate: (direction: -1 | 1) => void;
}) {
  if (!artifact && !entry) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">Select an item to inspect preview data.</div>;
  }

  const targetName = artifact?.name ?? entry?.name ?? "Selected item";
  const previewFacts = filterPreviewFacts([...(artifact?.preview ?? []), ...(preview?.summary ?? [])]);
  const archiveSummary =
    preview?.resolved_mode === "archive"
      ? preview.archive_entry_count != null
        ? preview.archive_entries_truncated
          ? `Showing ${(preview.offset + preview.archive_entries.length).toLocaleString()} of ${preview.archive_entry_count.toLocaleString()} archive entries`
          : `${preview.archive_entry_count.toLocaleString()} archive entries`
        : `${preview.archive_entries.length.toLocaleString()} recovered archive entries`
      : null;
  const archiveNavigation = preview?.resolved_mode === "archive";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white" title={targetName}>
            {targetName}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {(["auto", "text", "hex", "archive"] as const).map((candidate) => (
            <button
              className={
                mode === candidate
                  ? "rounded border border-[#5865f2]/50 bg-[#5865f2]/15 px-2.5 py-1 text-xs text-white"
                  : "rounded border border-white/8 px-2.5 py-1 text-xs text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }
              key={candidate}
              onClick={() => onChangeMode(candidate)}
              type="button"
            >
              {candidate}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          {preview
            ? archiveNavigation
              ? `${preview.resolved_mode} • entries ${preview.offset.toLocaleString()}-${(preview.offset + preview.archive_entries.length).toLocaleString()}`
              : `${preview.resolved_mode} • ${preview.offset.toString(16)}h • ${formatBytes(preview.total_size)}`
            : loading
              ? "Loading preview…"
              : error ?? "Preview unavailable"}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded border border-white/8 px-2 py-1 hover:bg-white/[0.04] disabled:opacity-40"
            disabled={!preview || preview.offset === 0}
            onClick={() => onNavigate(-1)}
            type="button"
          >
            Prev
          </button>
          <button
            className="rounded border border-white/8 px-2 py-1 hover:bg-white/[0.04] disabled:opacity-40"
            disabled={!preview || !preview.has_more}
            onClick={() => onNavigate(1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-white/8 bg-[#111318]">
        {error ? (
          <div className="border-b border-white/8 px-4 py-3 text-xs text-rose-300">{error}</div>
        ) : null}
        {preview?.warnings.length ? (
          <div className="border-b border-white/8 px-4 py-3 text-xs text-amber-300">
            {preview.warnings.join(" • ")}
          </div>
        ) : null}

        {preview?.resolved_mode === "text" ? (
          <pre className="whitespace-pre-wrap break-words px-4 py-4 font-mono text-[12px] leading-6 text-slate-200">
            {preview.text_excerpt ?? ""}
          </pre>
        ) : null}

        {preview?.resolved_mode === "hex" ? (
          <div className="min-w-max">
            <div className="grid grid-cols-[120px_520px_180px] gap-3 border-b border-white/6 bg-[#12151a] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <div>Offset</div>
              <div>Hex</div>
              <div>ASCII</div>
            </div>
            <div className="divide-y divide-white/6">
              {preview.hex_rows.map((row) => (
                <div className="grid grid-cols-[120px_520px_180px] gap-3 px-4 py-2 font-mono text-[12px]" key={row.offset}>
                  <div className="whitespace-nowrap text-slate-500">{`0x${row.offset.toString(16).padStart(8, "0")}`}</div>
                  <div className="whitespace-pre text-slate-200 tracking-[0.08em]">{row.hex}</div>
                  <div className="whitespace-pre text-slate-400">{row.ascii}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {preview?.resolved_mode === "archive" ? (
          <div className="min-w-max">
            {archiveSummary ? (
              <div className="border-b border-white/6 px-4 py-2 text-xs text-slate-400">{archiveSummary}</div>
            ) : null}
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(360px,1fr)_120px_120px_120px_120px] gap-4 border-b border-white/6 bg-[#12151a] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <div>Path</div>
              <div>Kind</div>
              <div>Size</div>
              <div>Packed</div>
              <div>Status</div>
            </div>
            <div className="divide-y divide-white/6">
              {preview.archive_entries.map((entry, index) => (
                <div
                  className="grid grid-cols-[minmax(360px,1fr)_120px_120px_120px_120px] gap-4 px-4 py-2 text-sm"
                  key={`${entry.path}-${index}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-slate-100" title={entry.path}>
                      {entry.path}
                    </div>
                    {entry.note ? <div className="mt-1 text-xs text-amber-300">{entry.note}</div> : null}
                  </div>
                  <div className="truncate text-slate-400" title={entry.kind ?? "-"}>
                    {entry.kind ?? "-"}
                  </div>
                  <div className="font-mono text-[12px] text-slate-300">{entry.size != null ? formatBytes(entry.size) : "-"}</div>
                  <div className="font-mono text-[12px] text-slate-400">
                    {entry.compressed_size != null ? formatBytes(entry.compressed_size) : "-"}
                  </div>
                  <div className={archiveEntryStatusClass(entry.status)}>{entry.status}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {!preview && loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading preview…</div>
        ) : null}
      </div>

      {previewFacts.length > 0 ? (
        <div className="mt-3 space-y-2">
          {previewFacts.map((fact) => <PreviewFactCard fact={fact} key={`${artifact?.id ?? entry?.path}-${fact.label}`} compact />)}
        </div>
      ) : null}
    </div>
  );
}

function DetailFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-200">{value}</div>
    </div>
  );
}

function PreviewFactCard({ fact, compact = false }: { fact: PreviewFact; compact?: boolean }) {
  return (
    <div className={`rounded-md border border-white/8 bg-[#111318] ${compact ? "px-3 py-2" : "px-3 py-2.5"}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{fact.label}</div>
      <div className="mt-1 truncate text-sm text-slate-200" title={fact.value}>
        {fact.value}
      </div>
    </div>
  );
}

const PREVIEW_FACTS_HIDDEN_LABELS = new Set([
  "path",
  "type",
  "size",
  "attr",
  "attr bits",
  "attributes",
  "access",
]);

function filterPreviewFacts(facts: PreviewFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const normalizedLabel = fact.label.trim().toLowerCase();
    if (PREVIEW_FACTS_HIDDEN_LABELS.has(normalizedLabel)) {
      return false;
    }

    const dedupeKey = `${normalizedLabel}:${fact.value}`;
    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function archiveEntryStatusClass(status: "ok" | "partial" | "damaged" | "unsupported") {
  switch (status) {
    case "ok":
      return "text-emerald-300";
    case "partial":
      return "text-amber-300";
    case "damaged":
      return "text-rose-300";
    case "unsupported":
    default:
      return "text-slate-400";
  }
}

function artifactStorage(artifact: ArtifactRecord) {
  if (artifact.recovery_plan.kind === "resident_base64") {
    return {
      kind: "Resident data",
      logicalSize: artifact.recovery_plan.logical_size,
      runCount: null,
      sourcePath: null,
      note: "File bytes are still embedded inside metadata and can be previewed without raw-disk reconstruction.",
    };
  }

  if (artifact.recovery_plan.kind === "raw_runs") {
    return {
      kind: "Raw NTFS runs",
      logicalSize: artifact.recovery_plan.logical_size,
      runCount: artifact.recovery_plan.runs.length,
      sourcePath: artifact.recovery_plan.source_path,
      note: null,
    };
  }

  return {
    kind: "Unrecoverable",
    logicalSize: artifact.size,
    runCount: null,
    sourcePath: null,
    note: artifact.recovery_plan.reason,
  };
}

function signatureStatusLabel(signature: ArtifactSignatureSummary | null) {
  if (!signature) {
    return "Signature state is loading.";
  }

  switch (signature.status) {
    case "valid":
      return "Embedded Authenticode verification passed.";
    case "none":
      return "No usable Authenticode signature was found.";
    case "invalid":
      return "Signature data exists, but the trust check failed or the file appears tampered.";
    case "indeterminate":
      return "Signature state could not be proven reliably in the current environment.";
    case "not_applicable":
    default:
      return "Authenticode is not applicable for this artifact family.";
  }
}

function signatureStatusClass(signature: ArtifactSignatureSummary | null) {
  switch (signature?.status) {
    case "valid":
      return "rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-300";
    case "invalid":
      return "rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-300";
    case "none":
      return "rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-400";
    case "indeterminate":
      return "rounded border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-300";
    default:
      return "rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-500";
  }
}
