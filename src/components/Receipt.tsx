import React, { forwardRef } from "react";
import { Product } from "@/store/useCartStore";
import { formatRupiah } from "@/lib/utils";

export type PaymentMethod = "cash" | "qris" | "transfer";

interface ReceiptProps {
  items: (Product & { quantity: number })[];
  total: number;
  cashReceived?: number;
  paymentMethod?: PaymentMethod;
  voucherCode?: string | null;
  discountAmount?: number;
  cashierName?: string;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer Bank",
};

const Receipt = forwardRef<HTMLDivElement, ReceiptProps>(
  ({ items, total, cashReceived, paymentMethod = "cash", voucherCode, discountAmount, cashierName }, ref) => {
    const date = new Date().toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const storeName =
      typeof window !== "undefined"
        ? (localStorage.getItem("settings_storeName") ?? "PNB POS")
        : "PNB POS";
    const receiptFooter =
      typeof window !== "undefined"
        ? (localStorage.getItem("settings_receiptFooter") ?? "Terima kasih telah berbelanja!")
        : "Terima kasih telah berbelanja!";

    const isCash = paymentMethod === "cash";
    const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod];

    return (
      <div className="hidden print:block">
        <div
          ref={ref}
          className="w-[58mm] p-2 bg-white text-black text-[12px] leading-tight"
          style={{ fontFamily: "monospace", color: "black", background: "white" }}
        >
          <div className="text-center mb-4">
            <h1 className="font-bold text-[16px] uppercase m-0">{storeName}</h1>
            <div className="border-b border-dashed border-black my-2" />
            <div className="flex justify-between text-[10px]">
              <p className="m-0">{date}</p>
              {cashierName && <p className="m-0 font-semibold">Kasir: {cashierName}</p>}
            </div>
            <div className="border-b border-dashed border-black my-2" />
          </div>

          <table className="w-full text-left border-collapse mb-2">
            <tbody>
              {items.map((item) => (
                <React.Fragment key={item.id}>
                  <tr>
                    <td colSpan={3} className="pb-1 font-semibold">{item.name}</td>
                  </tr>
                  <tr>
                    <td className="w-8">{item.quantity}x</td>
                    <td>{formatRupiah(item.price)}</td>
                    <td className="text-right">{formatRupiah(item.price * item.quantity)}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="border-b border-dashed border-black my-2" />

          {voucherCode && discountAmount ? (
            <>
              <div className="flex justify-between text-[12px] mt-1">
                <span>Subtotal</span>
                <span>{formatRupiah(total + discountAmount)}</span>
              </div>
              <div className="flex justify-between text-[12px] mt-1">
                <span>Diskon ({voucherCode})</span>
                <span>-{formatRupiah(discountAmount)}</span>
              </div>
            </>
          ) : null}

          <div className="flex justify-between font-bold text-[14px] mt-2">
            <span>TOTAL</span>
            <span>{formatRupiah(total)}</span>
          </div>

          <div className="border-b border-dashed border-black my-2" />

          {/* Metode Pembayaran */}
          <div className="flex justify-between text-[12px] mt-1">
            <span>Metode</span>
            <span className="font-semibold">{methodLabel}</span>
          </div>

          {/* Tunai & Kembalian — hanya tampil jika cash */}
          {isCash && cashReceived !== undefined && cashReceived > 0 && (
            <>
              <div className="flex justify-between text-[12px] mt-1">
                <span>Tunai</span>
                <span>{formatRupiah(cashReceived)}</span>
              </div>
              <div className="flex justify-between font-bold text-[12px] mt-1">
                <span>Kembalian</span>
                <span>{formatRupiah(cashReceived - total)}</span>
              </div>
            </>
          )}

          <div className="border-b border-dashed border-black my-2" />

          <div className="text-center mt-4">
            <p className="text-[10px] m-0">{receiptFooter}</p>
          </div>
        </div>
      </div>
    );
  }
);

Receipt.displayName = "Receipt";

export default Receipt;
