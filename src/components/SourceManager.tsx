"use client";

import { useEffect, useRef, useState } from "react";
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
  "rounded-lg border border-black/10 bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent";

function SummaryLine({ summary }: { summary: SyncSummary }) {
  return (
    <p className="text-xs text-muted">
      Обработано: {summary.processed} · Новых: {summary.created} · Обновлено: {summary.updated}
      {summary.needsReview > 0 && <> · Требуют проверки: {summary.needsReview}</>}
      {summary.errors > 0 && <> · Ошибок: {summary.errors}</>}
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
  return (
    <div className="flex flex-col gap-2 mb-4">
      {SYNC_IMPORT_FIELDS.map((field) => (
        <div key={field.key} className="flex items-center gap-3">
          <label className="w-48 shrink-0 text-sm">
            {field.label}
            {field.required && <span className="text-accent"> *</span>}
          </label>
          <select value={mapping[field.key] ?? ""} onChange={(e) => onChange(field.key, e.target.value)} className={`${inputClass} flex-1`}>
            <option value="">— не выбрано —</option>
            {headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `(колонка ${i + 1})`}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function SourceManager() {
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
      setCreateError(`Неизвестный формат файла. Поддерживаются: ${SUPPORTED_EXTENSIONS.join(", ")}.`);
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseFile(detected, buffer);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setCreateError("Файл пустой или не содержит строк с товарами.");
        return;
      }
      setFileFormat(detected);
      setFileTable(parsed);
      setFileMapping(suggestMapping(parsed.headers, SYNC_IMPORT_FIELDS));
      setSourceName(file.name.replace(/\.[^.]+$/, ""));
      setCreateStep("file");
    } catch {
      setCreateError("Не удалось прочитать файл.");
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
          name: sourceName.trim() || "Источник из файла",
          sourceType: fileFormat,
          columnMapping,
          connectionType: "file",
          connectionConfig: defaultBranchId ? { defaultBranchId } : {},
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        setCreateError(createData.error ?? "Не удалось создать источник.");
        return;
      }

      const syncRes = await fetch(`/api/admin/import-templates/${createData.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: fileTable, branchId: defaultBranchId || undefined }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) {
        setCreateError(syncData.error ?? "Источник создан, но синхронизация не удалась.");
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
      setCreateError("Укажите адрес (URL) источника.");
      return;
    }
    setSaving(true);
    setCreateError(null);
    try {
      const createRes = await fetch("/api/admin/import-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sourceName.trim() || "API-источник",
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
        setCreateError(createData.error ?? "Не удалось создать источник.");
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
        setCreateError(`Источник сохранён, но не удалось получить данные: ${previewData.error ?? "неизвестная ошибка"}`);
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
        setCreateError(data.error ?? "Не удалось синхронизировать.");
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
    if (!confirm("Удалить этот источник? Уже загруженные товары останутся в каталоге.")) return;
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
    <div className="bg-card rounded-2xl border border-black/5 p-6 mb-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-medium">Источник товаров и остатков</h2>
      </div>
      <p className="text-sm text-muted mb-4">
        Подключите файл или API той программы, где вы ведёте учёт — Beauty сама распознает товары и остатки по
        филиалам и будет обновлять их при каждой синхронизации.
      </p>

      <input ref={fileInputRef} type="file" accept={SUPPORTED_EXTENSIONS.join(",")} onChange={handleFileSelected} className="hidden" />
      <input ref={resyncFileInputRef} type="file" accept={SUPPORTED_EXTENSIONS.join(",")} onChange={handleResyncFileSelected} className="hidden" />

      {sources.length > 0 && (
        <div className="flex flex-col gap-3 mb-5">
          {sources.map((source) => {
            const result = resultBySource[source.id];
            return (
              <div key={source.id} className="border border-black/5 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{source.name}</span>
                    <span className="text-xs bg-accent-soft text-accent rounded-full px-2 py-0.5">
                      {source.connectionType === "api" ? "API" : `Файл (${source.sourceType.toUpperCase()})`}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteSource(source.id)} className="text-xs text-muted underline hover:text-accent">
                    Удалить
                  </button>
                </div>
                <p className="text-xs text-muted mb-2">
                  {source.lastSyncedAt ? `Последняя синхронизация: ${new Date(source.lastSyncedAt).toLocaleString("ru-RU")}` : "Ещё не синхронизировался."}
                </p>
                {source.lastSyncSummary && <SummaryLine summary={source.lastSyncSummary} />}
                {result?.summary && <SummaryLine summary={result.summary} />}
                {result?.error && <p className="text-xs text-red-600">{result.error}</p>}
                <div className="mt-2">
                  {source.connectionType === "api" ? (
                    <button
                      onClick={() => handleSyncApiSource(source)}
                      disabled={syncingId === source.id}
                      className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                    >
                      {syncingId === source.id ? "Синхронизируем…" : "Синхронизировать сейчас"}
                    </button>
                  ) : (
                    <button
                      onClick={() => triggerResyncFile(source.id)}
                      disabled={syncingId === source.id}
                      className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                    >
                      {syncingId === source.id ? "Синхронизируем…" : "Загрузить новый файл"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewItems.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4 mb-5">
          <h3 className="font-medium text-red-700 mb-2">Требуют проверки ({reviewItems.length})</h3>
          <div className="flex flex-col gap-3">
            {reviewItems.map((item) => (
              <div key={item.id} className="text-sm text-red-700 border-b border-red-100 pb-2">
                <p className="mb-1">{item.reason}</p>
                <p className="text-xs text-red-600/80 mb-2">
                  {Object.entries(item.rawRow)
                    .slice(0, 4)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleReviewAction(item.id, "resolved")} className="underline hover:opacity-80">
                    Отметить решённым
                  </button>
                  <button onClick={() => handleReviewAction(item.id, "ignored")} className="underline hover:opacity-80">
                    Игнорировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {createError && <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-4">{createError}</p>}

      {createStep === "closed" && (
        <button
          onClick={() => setCreateStep("choose-type")}
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5 active:scale-95"
        >
          + Подключить источник
        </button>
      )}

      {createStep === "choose-type" && (
        <div className="border-t border-black/10 pt-4">
          <h3 className="text-sm font-medium mb-3">Как магазин ведёт учёт товаров?</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => fileInputRef.current?.click()} className="rounded-full bg-accent text-white px-4 py-2 text-sm font-medium hover:opacity-90">
              Импорт файла
            </button>
            <button onClick={() => setCreateStep("api-form")} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5">
              Подключить через API
            </button>
            <button onClick={() => setCreateStep("other")} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5">
              Другой источник
            </button>
          </div>
          <button onClick={resetCreateFlow} className="text-sm text-muted underline">
            Отмена
          </button>
        </div>
      )}

      {createStep === "other" && (
        <div className="border-t border-black/10 pt-4">
          <p className="text-sm text-muted mb-3">
            Сейчас готовы два универсальных способа: загрузка файла (Excel/CSV/JSON — в любом формате, с любыми
            названиями колонок) и подключение по ссылке (API), если ваша программа умеет отдавать данные по URL.
            Если у вас другая программа без файла и без API — напишите нам, что это за программа, и мы посмотрим,
            можно ли подключить её отдельно.
          </p>
          <button onClick={resetCreateFlow} className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5">
            Понятно
          </button>
        </div>
      )}

      {createStep === "file" && fileTable && (
        <div className="border-t border-black/10 pt-4">
          <h3 className="text-sm font-medium mb-3">Сопоставьте колонки</h3>
          <div className="flex items-center gap-3 mb-4">
            <label className="w-48 shrink-0 text-sm">Название источника</label>
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} className={`${inputClass} flex-1`} />
          </div>
          <MappingEditor headers={fileTable.headers} mapping={fileMapping} onChange={handleFileMappingChange} />
          <div className="flex items-center gap-3 mb-4">
            <label className="w-48 shrink-0 text-sm">Филиал по умолчанию</label>
            <select value={defaultBranchId} onChange={(e) => setDefaultBranchId(e.target.value)} className={`${inputClass} flex-1`}>
              <option value="">— уточнять по колонке «Филиал» в файле —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={resetCreateFlow} className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-black/5">
              Отмена
            </button>
            <button
              onClick={handleCreateFileSource}
              disabled={saving}
              className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Сохраняем…" : "Сохранить и синхронизировать"}
            </button>
          </div>
        </div>
      )}

      {createStep === "api-form" && (
        <div className="border-t border-black/10 pt-4">
          <h3 className="text-sm font-medium mb-3">Подключение по API</h3>
          <p className="text-xs text-muted mb-3">
            Подходит для любой программы, которая может отдать список товаров по ссылке в формате CSV или JSON —
            например, отчёт МойСклад, опубликованная Google-таблица или собственный отчёт вашей программы.
          </p>
          <div className="flex flex-col gap-3 mb-4">
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Название источника" className={inputClass} />
            <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://…" className={inputClass} />
            <div className="flex gap-2">
              <input
                value={apiHeaderName}
                onChange={(e) => setApiHeaderName(e.target.value)}
                placeholder="Заголовок авторизации (необязательно), напр. Authorization"
                className={`${inputClass} flex-1`}
              />
              <input
                value={apiHeaderValue}
                onChange={(e) => setApiHeaderValue(e.target.value)}
                placeholder="Значение, напр. Bearer ..."
                className={`${inputClass} flex-1`}
              />
            </div>
            <select value={apiFormat} onChange={(e) => setApiFormat(e.target.value as "" | "csv" | "json")} className={inputClass}>
              <option value="">Формат ответа — определить автоматически</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
            <select value={defaultBranchId} onChange={(e) => setDefaultBranchId(e.target.value)} className={inputClass}>
              <option value="">Филиал по умолчанию — уточнять позже</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={resetCreateFlow} className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-black/5">
              Отмена
            </button>
            <button
              onClick={handleCreateApiSource}
              disabled={saving}
              className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Подключаем…" : "Подключить и получить данные"}
            </button>
          </div>
        </div>
      )}

      {createStep === "api-mapping" && (
        <div className="border-t border-black/10 pt-4">
          <h3 className="text-sm font-medium mb-3">Сопоставьте поля ответа</h3>
          <MappingEditor headers={apiPreviewHeaders} mapping={apiMapping} onChange={handleApiMappingChange} />
          <div className="flex gap-2">
            <button onClick={resetCreateFlow} className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-black/5">
              Отмена
            </button>
            <button
              onClick={handleConfirmApiMapping}
              disabled={saving}
              className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Синхронизируем…" : "Сохранить сопоставление и синхронизировать"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
