/**
 * Generate a CSV string from data with BOM for Excel Czech support.
 */
export function generateCSV(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const escape = (val: string | number | null | undefined): string => {
    const str = val == null ? "" : String(val);
    if (str.includes(";") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escape).join(";"),
    ...rows.map((row) => row.map(escape).join(";")),
  ];

  return "\uFEFF" + lines.join("\n");
}

/**
 * Trigger CSV download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
