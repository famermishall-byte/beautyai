"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buttonClasses } from "@/components/ui/Button";
import {
  SYNC_IMPORT_FIELDS,
  detectFormat,
  parseFile,
  suggestMapping,
  mappingToHeaderNames,
  SUPPORTED_EXTENSIONS,
  type RawTable,
  type ColumnMapping,
  type ImportFormat,
  type HeaderMapping,
  type SyncSummary,
} from "@/lib/import";

type Branch = { id: string; name: string };

type Source = {
  id: string;
  name: string;
  sourceType: string;
  columnMapping: HeaderMapping;
  connectionType: "file" | "api";
  connectionConfig: { url?: string; authHeaderName?: string; authHeaderValue?: string; format?: string; defaultBranchId?: string } | null;
  lastSyncedAt: string | null;
  lastSyncSummary: SyncSummary | null;
  createdAt: string;
};

type ReviewItem = {
  id: string;
  sourceId: string | null;
  rawRow: Record<string, string>;
  reason: string;
  createdAt: string;
};

type CreateStep = "closed" | "choose-type" | "file" | "api-form" | "api-mapping" | "other";

const inputClass =
  "rounded-control border border-border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent";

function SummaryLine({ summary }: { summary: SyncSummary }) {
  const t = useTranslations("sources");
  return (
    <p className="text-xs text-muted">
      {t("processed")}: {summary.processed} · {t("created")}: {summary.created} · {t("updated")}: {summary.updated}
      {summary.needsReview > 0 && <> · {t("needReview")}: {summary.needsReview}</>}
      {summary.errors > 0 && <> · {t("errorsCount")}: {summary.errors}</>}
    </p>
  );
}

function MappingEditor({
  headers,
  mapping,
  onChange,
}: {
  headers: string[];
  mapping: ColumnMapping;
  onChange: (field: string, value: string) => void;
}) {
  const t = useTranslations("sources");
  const tf = useTranslations("importFields");
  return (
    <div className="flex flex-col gap-2 mb-4">
      {SYNC_IMPORT_FIELDS.map((field) => (
        <div key={field.key} className="flex items-center gap-3">
          <label className="w-48 shrink-0 text-sm">
            {tf(field.key)}
            {field.required && <span className="text-accent"> *</span>}
          </label>
          <select value={mapping[field.key] ?? ""} onChange={(e) => onChange(field.key, e.target.value)} className={`${inputClass} flex-1`}>
            <option value="">{t("notChosen")}</option>
            {headers.map((h, i) => (
              <option key={i} value={i}>
                {h || t("columnN", { n: i + 1 })}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function SourceManager() {
  const t = useTranslations("sources");
  const locale = useLocale();
  const [sources, setSources] = useState<Source[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [resultBySource, setResultBySource] = useState<Record<string, { summary?: SyncSummary; error?: string }>>({});

  const [createStep, setCreateStep] = useState<CreateStep>("closed");
  const [createError, setCreateError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // File flow
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resyncFileInputRef = useRef<HTMLInputElement>(null);
  const [resyncSourceId, setResyncSourceId] = useState<string | null>(null);
  const [fileFormat, setFileFormat] = useState<ImportFormat | null>(null);
  const [fileTable, setFileTable] = useState<RawTable | null>(null);
  const [fileMapping, setFileMapping] = useState<ColumnMapping>({});
  const [sourceName, setSourceName] = useState("");
  const [defaultBranchId, setDefaultBranchId] = useState("");

  // API flow
  const [apiUrl, setApiUrl] = useState("");
  const [apiHeaderName, setApiHeaderName] = useState("");
  const [apiHeaderValue, setApiHeaderValue] = useState("");
  const [apiFormat, setApiFormat] = useState<"" | "csv" | "json">("");
  const [pendingApiSourceId, setPendingApiSourceId] = useState<string | null>(null);
  const [apiPreviewHeaders, setApiPreviewHeaders] = useState<string[]>([]);
  const [apiMapping, setApiMapping] = useState<ColumnMapping>({});

  async function loadAll() {
    const [sourcesRes, branchesRes, reviewRes] = await Promise.all([
      fetch("/api/admin/import-templates"),
      fetch("/api/admin/branches"),
      fetch("/api/admin/review-items"),
    ]);
    const sourcesData = await sourcesRes.json();
    const branchesData = await branchesRes.json();
    const reviewData = await reviewRes.json();
    setSources(sourcesData.templates ?? []);
    setBranches(branchesData.branches ?? []);
    setReviewItems(reviewData.items ?? []);
  }

  useEffect(() => {
    // Fetching data on mount (a genuine "synchronize with an external
    // system" effect, per https://react.dev/learn/synchronizing-with-effects)
    // — not a derived-state case, so there's no render-time equivalent here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  function resetCreateFlow() {
    setCreateStep("closed");
    setCreateError(null);
    setFileFormat(null);
    setFileTable(null);
    setFileMapping({});
    setSourceName("");
    setDefaultBranchId("");
    setApiUrl("");
    setApiHeaderName("");
    setApiHeaderValue("");
    setApiFormat("");
    setPendingApiSourceId(null);
    setApiPreviewHeaders([]);
    setApiMapping({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCreateError(null);
    const detected = detectFormat(file.name);
    if (!detected) {
      setCreateError(t("unknownFormat", { formats: SUPPORTED_EXTENSIONS.join(", ") }));
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseFile(detected, buffer);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setCreateError(t("emptyFile"));
        return;
      }
      setFileFormat(detected);
      setFileTable(parsed);
      setFileMapping(suggestMapping(parsed.headers, SYNC_IMPORT_FIELDS));
      setSourceName(file.name.replace(/\.[^.]+$/, ""));
      setCreateStep("file");
    } catch {
      setCreateError(t("readFailed"));
    }
  }

  async function handleCreateFileSource() {
    if (!fileTable || !fileFormat) return;
    setSaving(true);
    setCreateError(null);
    try {
      const columnMapping = mappingToHeaderNames(fileMapping, fileTable.headers);
      const createRes = await fetch("/api/admin/import-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceName.trim() || t("defaultFileSource"),
          sourceType: fileFormat,
          columnMapping,
          connectionType: "file",
          connectionConfig: defaultBranchId ? { defaultBranchId } : {},
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setCreateError(createData.error ?? t("createFailed"));
        return;
      }

      const syncRes = await fetch(`/api/admin/import-templates/${createData.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: fileTable, branchId: defaultBranchId || undefined }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) {
        setCreateError(syncData.error ?? t("createdSyncFailed"));
      }
      setResultBySource((prev) => ({ ...prev, [createData.id]: syncRes.ok ? { summary: syncData.summary } : { error: syncData.error } }));
      resetCreateFlow();
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateApiSource() {
    if (!apiUrl.trim()) {
      setCreateError(t("enterUrl"));
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      const createRes = await fetch("/api/admin/import-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceName.trim() || t("defaultApiSource"),
          sourceType: apiFormat || "json",
          columnMapping: {},
          connectionType: "api",
          connectionConfig: {
            url: apiUrl.trim(),
            authHeaderName: apiHeaderName.trim() || undefined,
            authHeaderValue: apiHeaderValue.trim() || undefined,
            format: apiFormat || undefined,
            defaultBranchId: defaultBranchId || undefined,
          },
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setCreateError(createData.error ?? t("createFailed"));
        return;
      }
      setPendingApiSourceId(createData.id);

      const previewRes = await fetch(`/api/admin/import-templates/${createData.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const previewData = await previewRes.json();
      if (!previewRes.ok) {
        setCreateError(t("savedNoData", { error: previewData.error ?? t("unknownError") }));
        await loadAll();
        return;
      }
      setApiPreviewHeaders(previewData.preview.headers);
      setApiMapping(suggestMapping(previewData.preview.headers, SYNC_IMPORT_FIELDS));
      setCreateStep("api-mapping");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmApiMapping() {
    if (!pendingApiSourceId) return;
    setSaving(true);
    setCreateError(null);
    try {
      const columnMapping = mappingToHeaderNames(apiMapping, apiPreviewHeaders);
      const res = await fetch(`/api/admin/import-templates/${pendingApiSourceId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnMapping, saveMapping: true, branchId: defaultBranchId || undefined }),
      });
      const data = await res.json();
      setResultBySource((prev) => ({ ...prev, [pendingApiSourceId]: res.ok ? { summary: data.summary } : { error: data.error } }));
      if (!res.ok) {
        setCreateError(data.error ?? t("syncFailed"));
        return;
      }
      resetCreateFlow();
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncApiSource(source: Source) {
    setSyncingId(source.id);
    try {
      const res = await fetch(`/api/admin/import-templates/${source.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setResultBySource((prev) => ({ ...prev, [source.id]: res.ok ? { summary: data.summary } : { error: data.error } }));
      await loadAll();
    } finally {
      setSyncingId(null);
    }
  }

  function triggerResyncFile(sourceId: string) {
    setResyncSourceId(sourceId);
    resyncFileInputRef.current?.click();
  }

  async function handleResyncFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const sourceId = resyncSourceId;
    if (!file || !sourceId) return;
    const source = sources.find((s) => s.id === sourceId);
    const detected = detectFormat(file.name);
    if (!detected || !source) return;

    setSyncingId(sourceId);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseFile(detected, buffer);
      const res = await fetch(`/api/admin/import-templates/${sourceId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: parsed, branchId: source.connectionConfig?.defaultBranchId }),
      });
      const data = await res.json();
      setResultBySource((prev) => ({ ...prev, [sourceId]: res.ok ? { summary: data.summary } : { error: data.error } }));
      await loadAll();
    } finally {
      setSyncingId(null);
      if (resyncFileInputRef.current) resyncFileInputRef.current.value = "";
      setResyncSourceId(null);
    }
  }

  async function handleDeleteSource(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/admin/import-templates/${id}`, { method: "DELETE" });
    await loadAll();
  }

  async function handleReviewAction(id: string, status: "resolved" | "ignored") {
    await fetch(`/api/admin/review-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setReviewItems((prev) => prev.filter((r) => r.id !== id));
  }

  function handleFileMappingChange(field: string, value: string) {
    setFileMapping((prev) => {
      const next = { ...prev };
      if (value === "") delete next[field as keyof ColumnMapping];
      else next[field as keyof ColumnMapping] = Number(value);
      return next;
    });
  }

  function handleApiMappingChange(field: string, value: string) {
    setApiMapping((prev) => {
      const next = { ...prev };
      if (value === "") delete next[field as keyof ColumnMapping];
      else next[field as keyof ColumnMapping] = Number(value);
      return next;
    });
  }

  return (
    <div className="surface-card p-6 mb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-medium">{t("title")}</h2>
      </div>
      <p className="text-sm text-muted mb-4">
        {t("intro")}
      </p>

      <input ref={fileInputRef} type="file" accept={SUPPORTED_EXTENSIONS.join(",")} onChange={handleFileSelected} className="hidden" />
      <input ref={resyncFileInputRef} type="file" accept={SUPPORTED_EXTENSIONS.join(",")} onChange={handleResyncFileSelected} className="hidden" />

      {sources.length > 0 && (
        <div className="flex flex-col gap-3 mb-5">
          {sources.map((source) => {
            const result = resultBySource[source.id];
            return (
              <div key={source.id} className="border border-border rounded-control p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{source.name}</span>
                    <span className="text-xs bg-accent-soft text-accent rounded-full px-2 py-0.5">
                      {source.connectionType === "api" ? "API" : t("fileType", { type: source.sourceType.toUpperCase() })}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteSource(source.id)} className="text-xs text-muted underline hover:text-accent focus-ring">
                    {t("delete")}
                  </button>
                </div>
                <p className="text-xs text-muted mb-2">
                  {source.lastSyncedAt ? t("lastSync", { when: new Date(source.lastSyncedAt).toLocaleString(locale) }) : t("neverSynced")}
                </p>
                {source.lastSyncSummary && <SummaryLine summary={source.lastSyncSummary} />}
                {result?.summary && <SummaryLine summary={result.summary} />}
                {result?.error && <p className="text-xs text-error">{result.error}</p>}
                <div className="mt-2">
                  {source.connectionType === "api" ? (
                    <button
                      onClick={() => handleSyncApiSource(source)}
                      disabled={syncingId === source.id}
                      className={buttonClasses({ size: "sm" })}
                    >
                      {syncingId === source.id ? t("syncing") : t("syncNow")}
                    </button>
                  ) : (
                    <button
                      onClick={() => triggerResyncFile(source.id)}
                      disabled={syncingId === source.id}
                      className={buttonClasses({ size: "sm" })}
                    >
                      {syncingId === source.id ? t("syncing") : t("uploadNewFile")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewItems.length > 0 && (
        <div className="bg-error-soft rounded-control p-4 mb-5">
          <h3 className="font-medium text-error mb-2">{t("needReview")} ({reviewItems.length})</h3>
          <div className="flex flex-col gap-3">
            {reviewItems.map((item) => (
              <div key={item.id} className="text-sm text-error border-b border-error/20 pb-2">
                <p className="mb-1">{item.reason}</p>
                <p className="text-xs text-error/80 mb-2">
                  {Object.entries(item.rawRow)
                    .slice(0, 4)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleReviewAction(item.id, "resolved")} className="underline hover:opacity-80 focus-ring">
                    {t("markResolved")}
                  </button>
                  <button onClick={() => handleReviewAction(item.id, "ignored")} className="underline hover:opacity-80 focus-ring">
                    {t("ignore")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {createError && <p className="text-sm bg-error-soft text-error rounded-control px-4 py-3 mb-4">{createError}</p>}

      {createStep === "closed" && (
        <button
          onClick={() => setCreateStep("choose-type")}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          + {t("connect")}
        </button>
      )}

      {createStep === "choose-type" && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-3">{t("howTracked")}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => fileInputRef.current?.click()} className={buttonClasses({ size: "sm" })}>
              {t("importFile")}
            </button>
            <button onClick={() => setCreateStep("api-form")} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {t("connectApi")}
            </button>
            <button onClick={() => setCreateStep("other")} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {t("otherSource")}
            </button>
          </div>
          <button onClick={resetCreateFlow} className="text-sm text-muted underline focus-ring">
            {t("cancel")}
          </button>
        </div>
      )}

      {createStep === "other" && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted mb-3">
            {t("otherText")}
          </p>
          <button onClick={resetCreateFlow} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            {t("gotIt")}
          </button>
        </div>
      )}

      {createStep === "file" && fileTable && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-3">{t("mapColumns")}</h3>
          <div className="flex items-center gap-3 mb-4">
            <label className="w-48 shrink-0 text-sm">{t("sourceName")}</label>
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className={`${inputClass} flex-1`} />
          </div>
          <MappingEditor headers={fileTable.headers} mapping={fileMapping} onChange={handleFileMappingChange} />
          <div className="flex items-center gap-3 mb-4">
            <label className="w-48 shrink-0 text-sm">{t("defaultBranch")}</label>
            <select value={defaultBranchId} onChange={(e) => setDefaultBranchId(e.target.value)} className={`${inputClass} flex-1`}>
              <option value="">{t("branchFromColumn")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={resetCreateFlow} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {t("cancel")}
            </button>
            <button
              onClick={handleCreateFileSource}
              disabled={saving}
              className={buttonClasses({ size: "sm" })}
            >
              {saving ? t("saving") : t("saveAndSync")}
            </button>
          </div>
        </div>
      )}

      {createStep === "api-form" && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-3">{t("apiTitle")}</h3>
          <p className="text-xs text-muted mb-3">
            {t("apiHint")}
          </p>
          <div className="flex flex-col gap-3 mb-4">
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder={t("sourceName")} className={inputClass} />
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://…" className={inputClass} />
            <div className="flex gap-2">
              <input
                value={apiHeaderName}
                onChange={(e) => setApiHeaderName(e.target.value)}
                placeholder={t("authHeader")}
                className={`${inputClass} flex-1`}
              />
              <input
                value={apiHeaderValue}
                onChange={(e) => setApiHeaderValue(e.target.value)}
                placeholder={t("authValue")}
                className={`${inputClass} flex-1`}
              />
            </div>
            <select value={apiFormat} onChange={(e) => setApiFormat(e.target.value as "" | "csv" | "json")} className={inputClass}>
              <option value="">{t("formatAuto")}</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
            <select value={defaultBranchId} onChange={(e) => setDefaultBranchId(e.target.value)} className={inputClass}>
              <option value="">{t("branchLater")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={resetCreateFlow} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {t("cancel")}
            </button>
            <button
              onClick={handleCreateApiSource}
              disabled={saving}
              className={buttonClasses({ size: "sm" })}
            >
              {saving ? t("connecting") : t("connectAndFetch")}
            </button>
          </div>
        </div>
      )}

      {createStep === "api-mapping" && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-3">{t("mapResponse")}</h3>
          <MappingEditor headers={apiPreviewHeaders} mapping={apiMapping} onChange={handleApiMappingChange} />
          <div className="flex gap-2">
            <button onClick={resetCreateFlow} className={buttonClasses({ variant: "ghost", size: "sm" })}>
              {t("cancel")}
            </button>
            <button
              onClick={handleConfirmApiMapping}
              disabled={saving}
              className={buttonClasses({ size: "sm" })}
            >
              {saving ? t("syncing") : t("saveMappingAndSync")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
