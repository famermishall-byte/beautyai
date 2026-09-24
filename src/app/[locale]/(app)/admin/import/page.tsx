"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { usePrice } from "@/lib/use-price";
import { Link } from "@/i18n/navigation";
import {
  IMPORT_FIELDS,
  detectFormat,
  parseFile,
  suggestMapping,
  buildImportRows,
  missingRequiredColumns,
  mappingToHeaderNames,
  mappingFromHeaderNames,
  SUPPORTED_EXTENSIONS,
  type RawTable,
  type ColumnMapping,
  type ImportFormat,
  type ImportRowResult,
} from "@/lib/import";

type Template = {
  id: string;
  name: string;
  sourceType: string;
  columnMapping: Record<string, string>;
  createdAt: string;
};

type Step = "file" | "mapping" | "preview" | "done";

export default function ImportPage() {
  // (`t` is used as a loop variable for templates below, so the translator is named ti / tf)
  const ti = useTranslations("adminImport");
  const tf = useTranslations("importFields");
  const price = usePrice();
  const [step, setStep] = useState<Step>("file");
  const [error, setError] = useState<string | null>(null);

  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [table, setTable] = useState<RawTable | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set());

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [rowResults, setRowResults] = useState<ImportRowResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skippedDuplicates: string[] } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/catalog")
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products: { sku: string }[] }) => {
        setExistingSkus(new Set((data.products ?? []).map((p) => p.sku)));
      })
      .catch(() => {});

    fetch("/api/admin/import-templates")
      .then((res) => (res.ok ? res.json() : { templates: [] }))
      .then((data: { templates: Template[] }) => setTemplates(data.templates ?? []))
      .catch(() => {});
  }, []);

  function resetWizard() {
    setStep("file");
    setError(null);
    setFormat(null);
    setTable(null);
    setMapping({});
    setRowResults([]);
    setImportResult(null);
    setShowSaveTemplate(false);
    setSelectedTemplateId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const detected = detectFormat(file.name);
    if (!detected) {
      setError(ti("unknownFormat", { formats: SUPPORTED_EXTENSIONS.join(", ") }));
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseFile(detected, buffer);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError(ti("emptyFile"));
        return;
      }

      setFormat(detected);
      setTable(parsed);
      setMapping(suggestMapping(parsed.headers));
      setStep("mapping");
    } catch {
      setError(ti("readFailed"));
    }
  }

  function handleApplyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    if (!templateId || !table) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setMapping(mappingFromHeaderNames(template.columnMapping, table.headers));
  }

  function handleMappingChange(field: string, value: string) {
    setMapping((prev) => {
      const next = { ...prev };
      if (value === "") delete next[field as keyof ColumnMapping];
      else next[field as keyof ColumnMapping] = Number(value);
      return next;
    });
  }

  function goToPreview() {
    if (!table) return;
    const missing = missingRequiredColumns(mapping);
    if (missing.length > 0) {
      setError(ti("mapRequired", { fields: missing.join(", ") }));
      return;
    }
    setError(null);
    setRowResults(buildImportRows(table, mapping, existingSkus));
    setStep("preview");
  }

  async function handleSaveTemplate() {
    if (!table || !templateNameDraft.trim()) return;
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/admin/import-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateNameDraft.trim(),
          sourceType: format,
          columnMapping: mappingToHeaderNames(mapping, table.headers),
        }),
      });
      if (res.ok) {
        setShowSaveTemplate(false);
        setTemplateNameDraft("");
        const listRes = await fetch("/api/admin/import-templates");
        const data = await listRes.json();
        setTemplates(data.templates ?? []);
      }
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    await fetch(`/api/admin/import-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedTemplateId === id) setSelectedTemplateId("");
  }

  async function handleImport() {
    const okProducts = rowResults.filter((r) => r.status === "ok").map((r) => r.product);
    if (okProducts.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: okProducts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? ti("importFailed"));
        return;
      }
      setImportResult({ imported: data.imported, skippedDuplicates: data.skippedDuplicates ?? [] });
      setStep("done");
    } finally {
      setImporting(false);
    }
  }

  const okRows = rowResults.filter((r) => r.status === "ok");
  const errorRows = rowResults.filter((r) => r.status === "error");

  const selectClass =
    "w-full rounded-lg border border-black/10 bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent";

  return (
    <main className="flex-1 px-4 py-10 max-w-3xl mx-auto w-full">
      <Link href="/admin" className="text-sm text-accent underline mb-4 inline-block">
        ← {ti("backToPanel")}
      </Link>
      <h1 className="font-display text-3xl mb-2">{ti("title")}</h1>
      <p className="text-muted mb-6">{ti("subtitle")}</p>

      {error && <p className="text-sm bg-red-50 text-red-600 rounded-lg px-4 py-3 mb-6">{error}</p>}

      {step === "file" && (
        <>
          {templates.length > 0 && (
            <div className="bg-card rounded-2xl border border-black/5 p-5 mb-6">
              <h2 className="font-medium mb-3">{ti("myTemplates")}</h2>
              <ul className="flex flex-col gap-2">
                {templates.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span>{t.name}</span>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="text-xs text-muted underline hover:text-accent"
                    >
                      {ti("delete")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-black/5 p-6">
            <h2 className="font-medium mb-3">{ti("step1")}</h2>
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_EXTENSIONS.join(",")}
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-accent file:text-white file:px-4 file:py-2 file:font-medium file:transition file:cursor-pointer hover:file:opacity-90"
            />
          </div>
        </>
      )}

      {step === "mapping" && table && (
        <div className="bg-card rounded-2xl border border-black/5 p-6">
          <h2 className="font-medium mb-1">{ti("step2")}</h2>
          <p className="text-sm text-muted mb-4">
            {ti("step2Hint")}
          </p>

          {templates.filter((t) => t.sourceType === format).length > 0 && (
            <div className="mb-5">
              <label className="text-sm text-muted block mb-1.5">{ti("applyTemplate")}</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleApplyTemplate(e.target.value)}
                className={selectClass}
              >
                <option value="">{ti("notChosen")}</option>
                {templates
                  .filter((t) => t.sourceType === format)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-3 mb-5">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <label className="w-40 shrink-0 text-sm">
                  {tf(field.key)}
                  {field.required && <span className="text-accent"> *</span>}
                </label>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  className={selectClass}
                >
                  <option value="">{ti("notChosen")}</option>
                  {table.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || ti("columnN", { n: i + 1 })}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!showSaveTemplate ? (
            <button
              onClick={() => setShowSaveTemplate(true)}
              className="text-sm text-accent underline mb-5"
            >
              💾 {ti("saveAsTemplate")}
            </button>
          ) : (
            <div className="flex gap-2 mb-5">
              <input
                value={templateNameDraft}
                onChange={(e) => setTemplateNameDraft(e.target.value)}
                placeholder={ti("templateName")}
                className={selectClass}
              />
              <button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateNameDraft.trim()}
                className="shrink-0 rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/5 disabled:opacity-50"
              >
                {savingTemplate ? ti("saving") : ti("save")}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={resetWizard}
              className="rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95"
            >
              {ti("cancel")}
            </button>
            <button
              onClick={goToPreview}
              className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95"
            >
              {ti("nextPreview")}
            </button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="flex flex-col gap-6">
          <div className="bg-card rounded-2xl border border-black/5 p-6">
            <h2 className="font-medium mb-1">{ti("step3")}</h2>
            <p className="text-sm text-muted mb-4">
              {ti("readyToImport")}: <span className="text-foreground font-medium">{okRows.length}</span>
              {errorRows.length > 0 && (
                <>
                  {" "}
                  · {ti("errors")}: <span className="text-red-600 font-medium">{errorRows.length}</span>
                </>
              )}
            </p>

            {okRows.length > 0 && (
              <div className="overflow-x-auto mb-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted border-b border-black/10">
                      <th className="py-2 pr-4">{tf("name")}</th>
                      <th className="py-2 pr-4">{tf("price")}</th>
                      <th className="py-2 pr-4">{tf("sku")}</th>
                      <th className="py-2 pr-4">{tf("inStock")}</th>
                      <th className="py-2 pr-4">{tf("brand")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {okRows.slice(0, 10).map((r) =>
                      r.status === "ok" ? (
                        <tr key={r.rowNumber} className="border-b border-black/5">
                          <td className="py-2 pr-4">{r.product.name}</td>
                          <td className="py-2 pr-4">{price(r.product.price)}</td>
                          <td className="py-2 pr-4">{r.product.sku}</td>
                          <td className="py-2 pr-4">{r.product.inStock ? "✅" : "—"}</td>
                          <td className="py-2 pr-4">{r.product.brand}</td>
                        </tr>
                      ) : null
                    )}
                  </tbody>
                </table>
                {okRows.length > 10 && (
                  <p className="text-xs text-muted mt-2">{ti("andMore", { n: okRows.length - 10 })}</p>
                )}
              </div>
            )}
          </div>

          {errorRows.length > 0 && (
            <div className="bg-red-50 rounded-2xl p-6">
              <h2 className="font-medium text-red-700 mb-3">{ti("errorRowsTitle")}</h2>
              <ul className="flex flex-col gap-2 text-sm text-red-700">
                {errorRows.map((r) =>
                  r.status === "error" ? (
                    <li key={r.rowNumber}>
                      <span className="font-medium">{ti("row", { n: r.rowNumber })}</span> ({r.preview.Название || ti("noName")}):{" "}
                      {r.errors.join(" ")}
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={resetWizard}
              className="rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95"
            >
              {ti("cancel")}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || okRows.length === 0}
              className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {importing ? ti("importing") : ti("importN", { n: okRows.length })}
            </button>
          </div>
        </div>
      )}

      {step === "done" && importResult && (
        <div className="bg-card rounded-2xl border border-black/5 p-6 text-center">
          <div className="text-4xl mb-3">💚</div>
          <h2 className="font-display text-2xl mb-2">{ti("done")}</h2>
          <p className="text-muted mb-1">{ti("added", { n: importResult.imported })}</p>
          {importResult.skippedDuplicates.length > 0 && (
            <p className="text-muted mb-4 text-sm">
              {ti("skippedDuplicates", { list: importResult.skippedDuplicates.join(", ") })}
            </p>
          )}
          <div className="flex gap-2 justify-center mt-4">
            <button
              onClick={resetWizard}
              className="rounded-full border border-black/10 px-6 py-3 font-medium transition hover:bg-black/5 active:scale-95"
            >
              {ti("uploadAnother")}
            </button>
            <Link
              href="/admin"
              className="rounded-full bg-accent text-white px-6 py-3 font-medium transition hover:opacity-90 active:scale-95"
            >
              {ti("toPanel")}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
