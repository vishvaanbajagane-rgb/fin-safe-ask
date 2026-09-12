import Papa from "papaparse";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { OUTPUT_COLUMNS, type EnrichedResult, type ResultRow } from "./types";

export function toOutputRows(results: EnrichedResult[]): ResultRow[] {
  return results.map((r) => ({
    request_id: r.request_id,
    amount_safe_to_pay: r.amount_safe_to_pay,
    affordability_status: r.affordability_status,
    recommended_payment_method: r.recommended_payment_method,
    payment_plan: r.payment_plan,
    earliest_date_for_full_payment: r.earliest_date_for_full_payment,
    spending_changes_needed: r.spending_changes_needed,
    decision_explanation: r.decision_explanation,
  }));
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(results: EnrichedResult[], filename = "output.csv") {
  const csv = Papa.unparse(toOutputRows(results), { columns: OUTPUT_COLUMNS as string[] });
  download(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function downloadJson(results: EnrichedResult[]) {
  const json = JSON.stringify(toOutputRows(results), null, 2);
  download(new Blob([json], { type: "application/json" }), "output.json");
}

export function downloadExcel(results: EnrichedResult[]) {
  const sheet = XLSX.utils.json_to_sheet(toOutputRows(results), {
    header: OUTPUT_COLUMNS as string[],
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "output");
  const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "output.xlsx",
  );
}

export function downloadPdf(results: EnrichedResult[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("FinSafe AI — Affordability Results", 40, 36);
  autoTable(doc, {
    startY: 52,
    head: [["Request", "Safe to pay", "Status", "Method", "Earliest full payment"]],
    body: results.map((r) => [
      r.request_id,
      r.amount_safe_to_pay,
      r.affordability_status,
      r.recommended_payment_method,
      r.earliest_date_for_full_payment || "—",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [26, 26, 26] },
  });
  doc.save("output.pdf");
}

export function downloadLog(text: string) {
  download(new Blob([text], { type: "text/plain;charset=utf-8" }), "log.txt");
}
