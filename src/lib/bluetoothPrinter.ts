import { formatRupiah } from "./utils";

// ESC/POS Commands
const ESC = 0x1B;
const GS = 0x1D;

export class EscPosBuilder {
  private buffer: number[] = [];

  // Reset printer
  init() {
    this.buffer.push(ESC, 0x40);
    return this;
  }

  // Text alignment
  alignLeft() {
    this.buffer.push(ESC, 0x61, 0x00);
    return this;
  }

  alignCenter() {
    this.buffer.push(ESC, 0x61, 0x01);
    return this;
  }

  alignRight() {
    this.buffer.push(ESC, 0x61, 0x02);
    return this;
  }

  // Text styling
  bold(on: boolean) {
    this.buffer.push(ESC, 0x45, on ? 1 : 0);
    return this;
  }

  textSize(width: number, height: number) {
    // Width and height 1-8
    const n = ((width - 1) << 4) | (height - 1);
    this.buffer.push(GS, 0x21, n);
    return this;
  }

  // Print text
  text(str: string) {
    for (let i = 0; i < str.length; i++) {
      this.buffer.push(str.charCodeAt(i));
    }
    return this;
  }

  textLine(str: string) {
    this.text(str);
    this.newline();
    return this;
  }

  newline(count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  // Draw line (e.g. ----------------------)
  drawLine(char: string = "-", length: number = 32) {
    let line = "";
    for (let i = 0; i < length; i++) {
      line += char;
    }
    this.textLine(line);
    return this;
  }

  // Feed and cut paper
  cut() {
    this.buffer.push(GS, 0x56, 0x41, 0x00);
    return this;
  }

  build() {
    return new Uint8Array(this.buffer);
  }
}

export interface ReceiptData {
  storeName: string;
  cashierName?: string;
  date: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount?: number;
  voucherCode?: string;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  footerMessage?: string;
}

export async function printReceiptBluetooth(data: ReceiptData): Promise<void> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error("Browser Anda tidak mendukung fitur Bluetooth (Web Bluetooth API).");
  }

  try {
    // Request Bluetooth Device
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // Generic Printer Service UUID
      ],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });

    if (!device.gatt) {
      throw new Error("GATT tidak tersedia pada perangkat ini.");
    }

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb'); // Generic Write Characteristic

    // Build ESC/POS bytes
    const builder = new EscPosBuilder();
    builder.init();
    
    // Header
    builder.alignCenter();
    builder.bold(true).textLine(data.storeName).bold(false);
    builder.drawLine("-");
    builder.alignLeft();
    builder.textLine(`Tgl  : ${data.date}`);
    if (data.cashierName) {
      builder.textLine(`Kasir: ${data.cashierName}`);
    }
    builder.drawLine("-");

    // Items (assuming 32 chars width printer)
    for (const item of data.items) {
      builder.textLine(`${item.name}`);
      const priceStr = formatRupiah(item.price);
      const totalStr = formatRupiah(item.price * item.quantity);
      // Format: 1x  Rp 10.000      Rp 10.000
      let line = `${item.quantity}x ${priceStr}`;
      // Pad spaces
      while (line.length + totalStr.length < 32) {
        line += " ";
      }
      line += totalStr;
      builder.textLine(line);
    }
    builder.drawLine("-");

    // Subtotal & Discount
    if (data.discount && data.discount > 0) {
      let subLine = `Subtotal`;
      const subVal = formatRupiah(data.subtotal);
      while (subLine.length + subVal.length < 32) subLine += " ";
      subLine += subVal;
      builder.textLine(subLine);

      let discLine = `Diskon`;
      const discVal = `-${formatRupiah(data.discount)}`;
      while (discLine.length + discVal.length < 32) discLine += " ";
      discLine += discVal;
      builder.textLine(discLine);
    }

    // Total
    builder.bold(true);
    let totalLine = `TOTAL`;
    const totalVal = formatRupiah(data.total);
    while (totalLine.length + totalVal.length < 32) totalLine += " ";
    totalLine += totalVal;
    builder.textLine(totalLine).bold(false);

    builder.drawLine("-");

    // Payment Details
    let payLine = `Metode`;
    const payVal = data.paymentMethod;
    while (payLine.length + payVal.length < 32) payLine += " ";
    payLine += payVal;
    builder.textLine(payLine);

    if (data.paymentMethod === "Tunai" && data.cashReceived) {
      let cashLine = `Tunai`;
      const cashVal = formatRupiah(data.cashReceived);
      while (cashLine.length + cashVal.length < 32) cashLine += " ";
      cashLine += cashVal;
      builder.textLine(cashLine);

      let changeLine = `Kembalian`;
      const changeVal = formatRupiah(data.cashReceived - data.total);
      while (changeLine.length + changeVal.length < 32) changeLine += " ";
      changeLine += changeVal;
      builder.textLine(changeLine);
    }

    builder.drawLine("-");

    // Footer
    builder.alignCenter();
    builder.textLine(data.footerMessage || "Terima kasih");
    builder.newline(3); // Feed paper
    // Some basic printers don't support cut command or cut automatically, but we send it anyway
    // builder.cut(); 

    const payload = builder.build();

    // Write to printer in chunks (some BLE devices have MTU limits e.g. 20-512 bytes)
    const CHUNK_SIZE = 100;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      await characteristic.writeValue(chunk);
    }

    await server.disconnect();

  } catch (error: any) {
    console.error("Bluetooth Print Error:", error);
    if (error.name === "NotFoundError") {
      throw new Error("Tidak ada printer yang dipilih atau proses dibatalkan.");
    }
    if (error.message.includes("Must be handling a user gesture")) {
      throw new Error("Pencetakan gagal: Browser membutuhkan interaksi klik dari pengguna.");
    }
    throw new Error(`Gagal mencetak: ${error.message}`);
  }
}
