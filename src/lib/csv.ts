// Client-side CSV export. Extracted from AuditLog's inline exportCSV so the
// schedule console (and phase 5's analytics) don't each re-implement it.
//
// Everything happens in the browser via a blob URL — no network call, so no
// org data leaves the page to produce a download.

/**
 * Escapes one CSV field per RFC 4180.
 *
 * The original inline version stripped commas out of notes (`replace(/,/g, ";")`),
 * which silently corrupted the exported text. Quoting instead keeps the data
 * intact, and also handles quotes, newlines, and leading/trailing spaces —
 * a resolution note containing a line break used to break the row alignment.
 */
function escapeField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.map(escapeField).join(","), ...rows.map((r) => r.map(escapeField).join(","))].join("\r\n");
}

/** Builds a CSV and triggers a download. `filename` gets a dated .csv suffix. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]): void {
  const csv = toCsv(headers, rows);
  // BOM so Excel opens UTF-8 correctly rather than mangling non-ASCII names.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
