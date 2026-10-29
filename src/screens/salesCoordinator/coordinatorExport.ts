
export const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const exportNamePart = (value: string) => value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'all-sales-persons';

export const exportDatePart = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : `${date.getDate()}${date.toLocaleString('en-IN', { month: 'short' })}`;
};

export const downloadCsv = (headers: readonly string[], rows: readonly (readonly unknown[])[], fileName: string) => {
  const blob = new Blob([`\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${fileName}.csv`; link.click();
  URL.revokeObjectURL(url);
};
