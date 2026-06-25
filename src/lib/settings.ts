const DEFAULTS = {
  storeName: "PNB POS",
  receiptFooter: "Terima kasih telah berbelanja!",
} as const;

export function getStoreName(): string {
  if (typeof window === "undefined") return DEFAULTS.storeName;
  return localStorage.getItem("settings_storeName") ?? DEFAULTS.storeName;
}

export function getReceiptFooter(): string {
  if (typeof window === "undefined") return DEFAULTS.receiptFooter;
  return localStorage.getItem("settings_receiptFooter") ?? DEFAULTS.receiptFooter;
}
