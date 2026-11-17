import Papa from "papaparse";

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true, dynamicTyping: false,
      complete: ({ data, errors, meta }) => {
        if (errors.length) reject(new Error(errors[0].message));
        else resolve({ data, fields: meta.fields || [] });
      },
      error: reject
    });
  });
}
export function downloadCsv(filename, rows) {
  const csv = Papa.unparse(rows || []);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
export function validateHeaders(fields, required) {
  const normalized = fields.map(x => String(x).trim().toLowerCase());
  return required.filter(x => !normalized.includes(x.toLowerCase()));
}