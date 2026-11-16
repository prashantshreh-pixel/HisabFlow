/**
 * Direct Web Bluetooth API + ESC/POS Thermal Printer Engine for HisabFlow POS
 * Supports 58mm (32-char) and 80mm (48-char) Bluetooth Low Energy (BLE) mini thermal printers
 * (Xprinter, GOOJPRT, PT-210, MTP-II, MTP-3, Rongta, Milestone, Rugtek, Shreyans, etc.)
 */

import { Sale, StoreProfile, DEFAULT_STORE_PROFILE } from '@/types';

// Common BLE GATT Service UUIDs used by mini thermal printers
export const KNOWN_PRINTER_SERVICES: string[] = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE Printer Service
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Xprinter / GOOJPRT / PT-210 / MTP-II BLE Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip ISSC Transparent UART Service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic BLE Thermal Printer Service (FF00)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / JDY BLE Serial Module (FFE0)
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '0000fee7-0000-1000-8000-00805f9b34fb', // WeChat / Mini Printer BLE Service
  '0000ae30-0000-1000-8000-00805f9b34fb', // Paperang / Meihengtong BLE Printer
  '00001101-0000-1000-8000-00805f9b34fb', // SPP over GATT
];

// Known Write Characteristic UUIDs (prioritized when multiple writable characteristics exist)
const KNOWN_WRITE_CHARACTERISTICS: string[] = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '49535343-1e4d-4bd9-ba61-23c647249616',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ffe1-0000-1000-8000-00805f9b34fb',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
];

export interface BluetoothPrinterState {
  isSupported: boolean;
  isConnected: boolean;
  deviceName: string | null;
  deviceId: string | null;
}

type PrinterStatusListener = (state: BluetoothPrinterState) => void;

// Module-level singleton connection state so the printer stays connected across sales
let activeDevice: any = null;
let activeCharacteristic: any = null;
const listeners = new Set<PrinterStatusListener>();

export function isWebBluetoothSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isWebSerialSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Transport modes:
 *  - 'ble'    : Web Bluetooth (BLE printers only)
 *  - 'rawbt'  : Android RawBT app (works with Bluetooth Classic/SPP printers - most cheap 58mm printers)
 *  - 'serial' : Web Serial (Windows/Mac/Linux Chrome/Edge; printer paired in OS as a COM port)
 */
export type PrinterTransport = 'ble' | 'rawbt' | 'serial';

let transport: PrinterTransport = (() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hisabflow_printer_transport');
    if (saved === 'ble' || saved === 'rawbt' || saved === 'serial') return saved;
    // Default: Android phones -> RawBT, otherwise Web Serial if available, else BLE
    if (/Android/i.test(navigator.userAgent)) return 'rawbt';
    if ('serial' in navigator) return 'serial';
  }
  return 'ble';
})();
let serialPort: any = null;

export function getPrinterTransport(): PrinterTransport {
  return transport;
}

export function setPrinterTransport(next: PrinterTransport): void {
  transport = next;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('hisabflow_printer_transport', next);
    } catch {
      // ignore
    }
  }
  notifyListeners();
}

function isTransportReady(): boolean {
  if (transport === 'rawbt') return true;
  if (transport === 'serial') return Boolean(serialPort?.writable);
  return Boolean(activeDevice?.gatt?.connected && activeCharacteristic);
}

export function getBluetoothPrinterState(): BluetoothPrinterState {
  const isConnected = isTransportReady();
  const name =
    transport === 'rawbt'
      ? 'RawBT (Android)'
      : transport === 'serial'
      ? 'Serial / COM Printer'
      : activeDevice?.name || 'Bluetooth Printer';
  return {
    isSupported:
      transport === 'rawbt' ? true : transport === 'serial' ? isWebSerialSupported() : isWebBluetoothSupported(),
    isConnected,
    deviceName: isConnected ? name : null,
    deviceId: isConnected ? activeDevice?.id || null : null,
  };
}

function notifyListeners() {
  const snapshot = getBluetoothPrinterState();
  listeners.forEach((fn) => {
    try {
      fn(snapshot);
    } catch {
      // ignore listener error
    }
  });
}

export function subscribePrinterStatus(listener: PrinterStatusListener): () => void {
  listeners.add(listener);
  listener(getBluetoothPrinterState());
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Discovers the best writable GATT characteristic from a connected BluetoothGATTServer.
 */
async function findWritableCharacteristic(server: any): Promise<any> {
  // 1. Try known printer services first
  for (const serviceUuid of KNOWN_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      const characteristics = await service.getCharacteristics();

      // Check prioritized characteristic UUIDs first
      for (const knownCharUuid of KNOWN_WRITE_CHARACTERISTICS) {
        const match = characteristics.find(
          (c: any) =>
            c.uuid?.toLowerCase() === knownCharUuid &&
            (c.properties?.writeWithoutResponse || c.properties?.write)
        );
        if (match) return match;
      }

      // Otherwise pick any writable characteristic in this service
      const writable = characteristics.find(
        (c: any) => c.properties?.writeWithoutResponse || c.properties?.write
      );
      if (writable) return writable;
    } catch {
      // Service not present on this printer, continue checking next
    }
  }

  // 2. Fallback: enumerate all primary services exposed by the device
  try {
    const allServices = await server.getPrimaryServices();
    for (const service of allServices) {
      try {
        const characteristics = await service.getCharacteristics();
        const writable = characteristics.find(
          (c: any) => c.properties?.writeWithoutResponse || c.properties?.write
        );
        if (writable) return writable;
      } catch {
        // continue
      }
    }
  } catch {
    // ignore
  }

  throw new Error(
    'Connected to Bluetooth device, but no writable ESC/POS printer characteristic was found. Make sure the printer is switched on and supports BLE printing.'
  );
}

/**
 * Connects (or reconnects) to a BLE mini thermal printer.
 * Prompts the browser Web Bluetooth picker if not already paired in this session.
 */
export async function connectBluetoothPrinter(forceNewDevice = false): Promise<BluetoothPrinterState> {
  if (transport === 'rawbt') {
    notifyListeners();
    return getBluetoothPrinterState();
  }

  if (transport === 'serial') {
    if (!isWebSerialSupported()) {
      throw new Error('Web Serial is not supported in this browser. Use Chrome or Edge on Windows/Mac/Linux.');
    }
    if (!forceNewDevice && serialPort?.writable) {
      notifyListeners();
      return getBluetoothPrinterState();
    }
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    serialPort = port;
    notifyListeners();
    return getBluetoothPrinterState();
  }

  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge on Android, Windows, or macOS.'
    );
  }

  // If already connected and not forcing a new device picker, return existing connection
  if (!forceNewDevice && activeDevice?.gatt?.connected && activeCharacteristic) {
    notifyListeners();
    return getBluetoothPrinterState();
  }

  // If we have a previously selected device in this session that disconnected, try reconnecting first
  if (!forceNewDevice && activeDevice?.gatt) {
    try {
      const server = await activeDevice.gatt.connect();
      activeCharacteristic = await findWritableCharacteristic(server);
      notifyListeners();
      return getBluetoothPrinterState();
    } catch {
      // Reconnect failed; fall through to requestDevice picker
      activeDevice = null;
      activeCharacteristic = null;
    }
  }

  const navBluetooth = (navigator as any).bluetooth;

  // Open Web Bluetooth native device selector
  const device = await navBluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: KNOWN_PRINTER_SERVICES,
  });

  if (!device.gatt) {
    throw new Error('Selected Bluetooth device does not support GATT connections.');
  }

  device.addEventListener('gattserverdisconnected', () => {
    activeCharacteristic = null;
    notifyListeners();
  });

  const server = await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);

  activeDevice = device;
  activeCharacteristic = characteristic;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('hisabflow_bt_printer_name', device.name || 'Bluetooth Printer');
    } catch {
      // ignore storage errors
    }
  }

  notifyListeners();
  return getBluetoothPrinterState();
}

/**
 * Disconnects the currently paired Bluetooth thermal printer.
 */
export function disconnectBluetoothPrinter(): void {
  try {
    if (activeDevice?.gatt?.connected) {
      activeDevice.gatt.disconnect();
    }
  } catch {
    // ignore
  } finally {
    activeDevice = null;
    activeCharacteristic = null;
    notifyListeners();
  }
}

/**
 * Streams raw ESC/POS bytes to the active BLE GATT characteristic in safe chunks
 * so the mini printer's serial buffer never overflows.
 */
async function sendEscPosBytes(data: Uint8Array): Promise<void> {
  if (transport === 'rawbt') {
    let bin = '';
    for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]);
    window.location.href = `rawbt:base64,${btoa(bin)}`;
    return;
  }

  if (transport === 'serial') {
    if (!serialPort?.writable) await connectBluetoothPrinter(false);
    const writer = serialPort.writable.getWriter();
    try {
      const SERIAL_CHUNK = 256;
      for (let o = 0; o < data.length; o += SERIAL_CHUNK) {
        await writer.write(data.slice(o, o + SERIAL_CHUNK));
        await new Promise((r) => setTimeout(r, 10));
      }
    } finally {
      writer.releaseLock();
    }
    return;
  }

  if (!activeDevice?.gatt?.connected || !activeCharacteristic) {
    await connectBluetoothPrinter(false);
  }

  if (!activeCharacteristic) {
    throw new Error('Bluetooth printer is not connected.');
  }

  const canWriteWithoutResponse = Boolean(activeCharacteristic.properties?.writeWithoutResponse);
  // 64 bytes per packet works reliably across 20-byte and 100-byte MTU BLE printers
  const CHUNK_SIZE = 64;
  const DELAY_MS = 18;

  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
    try {
      if (canWriteWithoutResponse && typeof activeCharacteristic.writeValueWithoutResponse === 'function') {
        await activeCharacteristic.writeValueWithoutResponse(chunk);
      } else if (typeof activeCharacteristic.writeValueWithResponse === 'function') {
        await activeCharacteristic.writeValueWithResponse(chunk);
      } else {
        await activeCharacteristic.writeValue(chunk);
      }
    } catch {
      // Fallback: if 64-byte chunk exceeded a strict 20-byte MTU printer, split into 20-byte sub-chunks
      for (let sub = 0; sub < chunk.length; sub += 20) {
        const subChunk = chunk.slice(sub, Math.min(sub + 20, chunk.length));
        if (canWriteWithoutResponse && typeof activeCharacteristic.writeValueWithoutResponse === 'function') {
          await activeCharacteristic.writeValueWithoutResponse(subChunk);
        } else {
          await activeCharacteristic.writeValue(subChunk);
        }
        await new Promise((r) => setTimeout(r, 12));
      }
    }

    if (offset + CHUNK_SIZE < data.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
}

// ============================================================================
// ESC/POS BINARY COMMAND BUILDER
// ============================================================================

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD_INIT = [ESC, 0x40]; // Initialize printer
const CMD_ALIGN_LEFT = [ESC, 0x61, 0x00];
const CMD_ALIGN_CENTER = [ESC, 0x61, 0x01];
const CMD_BOLD_ON = [ESC, 0x45, 0x01];
const CMD_BOLD_OFF = [ESC, 0x45, 0x00];
const CMD_SIZE_NORMAL = [GS, 0x21, 0x00];
const CMD_SIZE_DOUBLE_HEIGHT = [GS, 0x21, 0x01];
const CMD_CUT_PAPER = [GS, 0x56, 0x42, 0x00]; // Feed & partial cut

/**
 * Sanitizes text for standard single-byte ASCII ESC/POS thermal printers.
 * Replaces Devanagari rupee / Unicode symbols with clean ASCII equivalents.
 */
function sanitizeEscPosText(input: string): string {
  if (!input) return '';
  // Convert Nepali digits ०-९ to ASCII 0-9 so thermal printers without Devanagari ROM print numbers cleanly
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  let out = input;
  nepaliDigits.forEach((d, idx) => {
    out = out.split(d).join(String(idx));
  });

  out = out
    .replace(/रू\.?|रु\.?|₹/g, 'Rs.')
    .replace(/[•·]/g, '-')
    .replace(/[\u2014\u2013]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  // Strip any remaining non-ASCII characters (> 0x7E) or replace with space
  let ascii = '';
  for (let i = 0; i < out.length; i++) {
    const code = out.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      ascii += out[i];
    }
  }
  return ascii.trim();
}

function encodeAsciiLine(text: string): number[] {
  const clean = sanitizeEscPosText(text);
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    bytes.push(clean.charCodeAt(i));
  }
  bytes.push(LF);
  return bytes;
}

function formatLeftRight(left: string, right: string, width: number): string {
  const l = sanitizeEscPosText(left);
  const r = sanitizeEscPosText(right);
  const maxLeft = Math.max(1, width - r.length - 1);
  const trimmedLeft = l.length > maxLeft ? l.substring(0, maxLeft) : l;
  const spaces = Math.max(1, width - trimmedLeft.length - r.length);
  return trimmedLeft + ' '.repeat(spaces) + r;
}

function formatItemRow(
  itemName: string,
  qty: string,
  rate: string,
  amt: string,
  width: number
): string[] {
  const cleanName = sanitizeEscPosText(itemName).toUpperCase() || 'ITEM';
  if (width <= 32) {
    // 58mm (32 chars): Name(13) + Qty(5) + Rate(6) + Amt(8) = 32
    const qCol = qty.padStart(5, ' ');
    const rCol = rate.padStart(6, ' ');
    const aCol = amt.padStart(8, ' ');
    if (cleanName.length <= 12) {
      return [cleanName.padEnd(13, ' ') + qCol + rCol + aCol];
    }
    // Print full item name on line 1, and numbers right-aligned on line 2
    return [
      cleanName.substring(0, 32),
      ' '.repeat(13) + qCol + rCol + aCol,
    ];
  } else {
    // 80mm (48 chars): Name(22) + Qty(7) + Rate(9) + Amt(10) = 48
    const qCol = qty.padStart(7, ' ');
    const rCol = rate.padStart(9, ' ');
    const aCol = amt.padStart(10, ' ');
    if (cleanName.length <= 21) {
      return [cleanName.padEnd(22, ' ') + qCol + rCol + aCol];
    }
    return [
      cleanName.substring(0, 48),
      ' '.repeat(22) + qCol + rCol + aCol,
    ];
  }
}

function getPaymentMethodAscii(method: number): string {
  switch (method) {
    case 1:
      return 'CASH';
    case 2:
      return 'QR PAY (DIGITAL)';
    case 3:
      return 'KHATA (CREDIT)';
    case 4:
      return 'SPLIT PAYMENT';
    default:
      return 'CASH';
  }
}

/**
 * Builds the complete ESC/POS binary byte payload for a POS Sale receipt.
 */
export function buildSaleEscPosPayload(
  sale: Sale,
  storeProfile?: StoreProfile | null,
  paperWidth: '58mm' | '80mm' = '58mm',
  formattedDate?: string,
  formattedTime?: string
): Uint8Array {
  const profile = storeProfile || DEFAULT_STORE_PROFILE;
  const cols = paperWidth === '80mm' ? 48 : 32;
  const divider = '-'.repeat(cols);
  const doubleDivider = '='.repeat(cols);
  const cur = sanitizeEscPosText(profile.currencySymbol || 'Rs.') || 'Rs.';

  const bytes: number[] = [];
  const push = (...cmds: number[][]) => {
    for (const c of cmds) bytes.push(...c);
  };

  // 1. Initialize printer
  push(CMD_INIT);

  // 2. Store Header (Centered)
  push(CMD_ALIGN_CENTER, CMD_BOLD_ON, CMD_SIZE_DOUBLE_HEIGHT);
  push(encodeAsciiLine((profile.storeName || 'HISABFLOW STORE').toUpperCase()));
  push(CMD_SIZE_NORMAL, CMD_BOLD_OFF);

  if (profile.tagline) {
    const tag = sanitizeEscPosText(profile.tagline);
    if (tag) push(encodeAsciiLine(tag));
  }
  if (profile.address) {
    const addr = sanitizeEscPosText(profile.address);
    if (addr) push(encodeAsciiLine(addr));
  }
  if (profile.phone) {
    push(encodeAsciiLine(`Tel: ${profile.phone}`));
  }
  if (profile.panNumber) {
    push(CMD_BOLD_ON, encodeAsciiLine(`PAN/VAT: ${profile.panNumber}`), CMD_BOLD_OFF);
  }

  push(CMD_BOLD_ON);
  push(encodeAsciiLine(sale.taxAmount > 0 ? '** TAX INVOICE **' : '** CASH BILL **'));
  if (sale.isRefunded) {
    push(encodeAsciiLine('*** REFUNDED / RETURNED ***'));
  }
  push(CMD_BOLD_OFF);
  push(encodeAsciiLine(divider));

  // 3. Bill Metadata (Left Aligned)
  push(CMD_ALIGN_LEFT);
  const dateStr = sanitizeEscPosText(formattedDate || new Date(sale.saleDate).toLocaleDateString('en-GB'));
  const timeStr = sanitizeEscPosText(formattedTime || '');
  push(encodeAsciiLine(formatLeftRight('BILL NO:', sale.invoiceNumber, cols)));
  push(encodeAsciiLine(formatLeftRight('DATE:', `${dateStr} ${timeStr}`.trim(), cols)));
  if (sale.customerName) {
    const custName = sanitizeEscPosText(sale.customerName) || 'Walk-in Customer';
    push(encodeAsciiLine(formatLeftRight('CUSTOMER:', custName.substring(0, cols - 10), cols)));
  }
  push(encodeAsciiLine(formatLeftRight('PAYMENT:', getPaymentMethodAscii(sale.paymentMethod), cols)));
  push(encodeAsciiLine(divider));

  // 4. Table Header
  push(CMD_BOLD_ON);
  if (cols <= 32) {
    push(encodeAsciiLine('ITEM           QTY  RATE     AMT'));
  } else {
    push(encodeAsciiLine('ITEM                     QTY     RATE       AMT'));
  }
  push(CMD_BOLD_OFF);
  push(encodeAsciiLine(divider));

  // 5. Line Items
  sale.items.forEach((item, idx) => {
    const qtyStr = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(1);
    const rateStr = item.unitPrice.toFixed(0);
    const amtStr = item.subtotal.toFixed(2);
    const rows = formatItemRow(`${idx + 1}.${item.productName}`, qtyStr, rateStr, amtStr, cols);
    rows.forEach((r) => push(encodeAsciiLine(r)));
  });

  push(encodeAsciiLine(divider));

  // 6. Subtotal, Discount, VAT, Grand Total
  push(encodeAsciiLine(formatLeftRight('GROSS SUBTOTAL:', `${cur} ${sale.subtotal.toFixed(2)}`, cols)));
  if (sale.discountAmount > 0) {
    push(encodeAsciiLine(formatLeftRight('DISCOUNT:', `- ${cur} ${sale.discountAmount.toFixed(2)}`, cols)));
  }
  if (sale.taxAmount > 0) {
    push(encodeAsciiLine(formatLeftRight('VAT (13%):', `${cur} ${sale.taxAmount.toFixed(2)}`, cols)));
  }

  push(encodeAsciiLine(doubleDivider));
  push(CMD_BOLD_ON, CMD_SIZE_DOUBLE_HEIGHT);
  push(encodeAsciiLine(formatLeftRight('TOTAL:', `${cur} ${sale.totalAmount.toFixed(2)}`, cols)));
  push(CMD_SIZE_NORMAL, CMD_BOLD_OFF);
  push(encodeAsciiLine(doubleDivider));

  // 7. Settlement Details
  if (sale.paymentMethod === 1) {
    push(encodeAsciiLine(formatLeftRight('CASH TENDERED:', `${cur} ${sale.paidAmount.toFixed(2)}`, cols)));
    push(CMD_BOLD_ON);
    push(encodeAsciiLine(formatLeftRight('CHANGE RETURN:', `${cur} ${sale.changeAmount.toFixed(2)}`, cols)));
    push(CMD_BOLD_OFF);
  } else if (sale.paymentMethod === 2) {
    push(encodeAsciiLine(formatLeftRight('QR RECEIVED:', `${cur} ${(sale.digitalPaid || sale.totalAmount).toFixed(2)}`, cols)));
  } else if (sale.paymentMethod === 3) {
    push(CMD_BOLD_ON);
    push(encodeAsciiLine(formatLeftRight('KHATA DUE:', `${cur} ${(sale.creditPaid || sale.totalAmount).toFixed(2)}`, cols)));
    push(CMD_BOLD_OFF);
  } else if (sale.paymentMethod === 4) {
    if (sale.cashPaid > 0) {
      push(encodeAsciiLine(formatLeftRight('CASH PAID:', `${cur} ${sale.cashPaid.toFixed(2)}`, cols)));
    }
    if (sale.digitalPaid > 0) {
      push(encodeAsciiLine(formatLeftRight('QR PAID:', `${cur} ${sale.digitalPaid.toFixed(2)}`, cols)));
    }
    if (sale.creditPaid > 0) {
      push(CMD_BOLD_ON);
      push(encodeAsciiLine(formatLeftRight('KHATA DUE:', `${cur} ${sale.creditPaid.toFixed(2)}`, cols)));
      push(CMD_BOLD_OFF);
    }
  }

  push(encodeAsciiLine(divider));

  // 8. Footer (Centered)
  push(CMD_ALIGN_CENTER);
  const footerText = sanitizeEscPosText(profile.receiptFooter || 'Thank you for shopping with us!');
  if (footerText) {
    push(CMD_BOLD_ON, encodeAsciiLine(footerText.toUpperCase()), CMD_BOLD_OFF);
  }
  push(encodeAsciiLine('*** VISIT AGAIN ***'));
  push(encodeAsciiLine('Powered by HisabFlow POS'));

  // Feed 4 lines & Cut
  bytes.push(LF, LF, LF, LF);
  push(CMD_CUT_PAPER);

  return new Uint8Array(bytes);
}

/**
 * Prints a Sale receipt directly over Web Bluetooth ESC/POS.
 * Automatically prompts to pair if not yet connected.
 */
export async function printSaleViaBluetooth(
  sale: Sale,
  storeProfile?: StoreProfile | null,
  paperWidth: '58mm' | '80mm' = '58mm',
  formattedDate?: string,
  formattedTime?: string
): Promise<BluetoothPrinterState> {
  if (!isTransportReady()) {
    await connectBluetoothPrinter(false);
  }

  const payload = buildSaleEscPosPayload(sale, storeProfile, paperWidth, formattedDate, formattedTime);
  await sendEscPosBytes(payload);
  return getBluetoothPrinterState();
}

/**
 * Prints a quick test page to verify Bluetooth mini printer alignment & connection.
 */
export async function printBluetoothTestPage(
  storeProfile?: StoreProfile | null,
  paperWidth: '58mm' | '80mm' = '58mm'
): Promise<BluetoothPrinterState> {
  if (!isTransportReady()) {
    await connectBluetoothPrinter(false);
  }

  const profile = storeProfile || DEFAULT_STORE_PROFILE;
  const cols = paperWidth === '80mm' ? 48 : 32;
  const divider = '-'.repeat(cols);

  const bytes: number[] = [];
  const push = (...cmds: number[][]) => {
    for (const c of cmds) bytes.push(...c);
  };

  push(CMD_INIT, CMD_ALIGN_CENTER, CMD_BOLD_ON, CMD_SIZE_DOUBLE_HEIGHT);
  push(encodeAsciiLine((profile.storeName || 'HISABFLOW POS').toUpperCase()));
  push(CMD_SIZE_NORMAL, CMD_BOLD_OFF);
  push(encodeAsciiLine('BLUETOOTH THERMAL PRINTER TEST'));
  push(encodeAsciiLine(divider));
  push(CMD_ALIGN_LEFT);
  push(encodeAsciiLine(formatLeftRight('STATUS:', 'CONNECTED OK', cols)));
  push(encodeAsciiLine(formatLeftRight('PRINTER:', activeDevice?.name || 'BLE Printer', cols)));
  push(encodeAsciiLine(formatLeftRight('PAPER WIDTH:', `${paperWidth} (${cols} cols)`, cols)));
  push(encodeAsciiLine(divider));
  push(CMD_ALIGN_CENTER, CMD_BOLD_ON);
  push(encodeAsciiLine('ESC/POS READY FOR BILLING'));
  push(CMD_BOLD_OFF);
  bytes.push(LF, LF, LF, LF);
  push(CMD_CUT_PAPER);

  await sendEscPosBytes(new Uint8Array(bytes));
  return getBluetoothPrinterState();
}
