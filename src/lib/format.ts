export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** PDF-safe currency format — replaces non-ASCII symbols (e.g. ₦) with currency code */
export function formatCurrencyForPdf(amount: number, currency: string): string {
  const formatted = formatCurrency(amount, currency);
  // Replace any non-ASCII currency symbols with the ISO code
  const cleaned = formatted.replace(/[^\x00-\x7F]+/g, "").trim();
  // If the symbol was stripped, prefix with currency code
  if (cleaned === amount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) || !cleaned.match(/[a-zA-Z]/)) {
    return `${currency} ${cleaned || amount.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return formatted;
}

export function daysOverdue(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}
