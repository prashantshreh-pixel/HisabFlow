import QRCode from 'qrcode';

export interface DynamicQrPayloadOptions {
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  bankCodeCIPS?: string;
  bankName?: string;
  amount: number;
  remarks?: string;
  merchantId?: string;
  acquirerId?: string;
  terminalLabel?: string;
  city?: string;
  format?: 'FONEPAY_DYNAMIC' | 'EMVCO_NEPALPAY' | 'MOBANK_JSON';
}

/**
 * Calculates CRC-16 CCITT (polynomial 0x1021, initial value 0xFFFF)
 * as required by the EMVCo, Fonepay, and NepalQR specifications.
 */
export function calculateCrc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    const byte = data.charCodeAt(i);
    crc ^= byte << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Generates an EMVCo-compliant Fonepay Dynamic QR string with pre-filled amount.
 * Point of Initiation = '12' (Dynamic QR), Tag 54 = Exact Transaction Amount.
 * Scannable by any mobile banking app and digital wallet in Nepal (Fonepay, Khalti, eSewa, etc.).
 *
 * Defaults to Anjali Store Fonepay Terminal 2222610021768837, Acquirer 4271420021768837 (Lalitpur MP).
 */
export function buildFonepayDynamicQr(options: DynamicQrPayloadOptions): string {
  const {
    accountName = 'Anjali Store',
    merchantId = options.merchantId || options.accountNumber || '2222610021768837',
    acquirerId = options.acquirerId || options.bankCodeCIPS || '4271420021768837',
    terminalLabel = options.terminalLabel || '2236157',
    city = options.city || 'Lalitpur MP',
    amount,
    remarks,
  } = options;

  const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';

  const tag00 = formatTlv('00', '01');
  const tag01 = formatTlv('01', '12'); // 12 = Dynamic QR (pre-filled amount)
  const tag02 = formatTlv('02', acquirerId);

  // Tag 26: Merchant Account Information (Fonepay)
  const sub26_00 = formatTlv('00', 'fonepay.com');
  const sub26_07 = formatTlv('07', merchantId);
  const sub26_11 = formatTlv('11', '1');
  const tag26 = formatTlv('26', `${sub26_00}${sub26_07}${sub26_11}`);

  const tag52 = formatTlv('52', '5331'); // Merchant Category Code
  const tag53 = formatTlv('53', '524');  // Currency: NPR (524)

  let tag54 = '';
  if (amount > 0) {
    tag54 = formatTlv('54', formattedAmount); // Exact pre-filled transaction amount
  }

  const tag58 = formatTlv('58', 'NP');
  const tag59 = formatTlv('59', accountName.slice(0, 25));
  const tag60 = formatTlv('60', city.slice(0, 15));

  // Tag 62: Additional Data Field (Reference/Bill No + Terminal Label)
  let sub62 = '';
  if (remarks && remarks.trim()) {
    sub62 += formatTlv('01', remarks.trim().slice(0, 25));
  }
  if (terminalLabel) {
    sub62 += formatTlv('07', terminalLabel);
  }
  const tag62 = sub62 ? formatTlv('62', sub62) : '';

  const partial = `${tag00}${tag01}${tag02}${tag26}${tag52}${tag53}${tag54}${tag58}${tag59}${tag60}${tag62}6304`;
  const checksum = calculateCrc16Ccitt(partial);
  return `${partial}${checksum}`;
}

/**
 * Generates an EMVCo-compliant Dynamic NepalQR string
 * Point of Initiation = '12' (Dynamic QR), Tag 54 = Exact Amount
 */
export function buildEmvCoNepalQr(options: DynamicQrPayloadOptions): string {
  const { accountName, accountNumber, bankCode = 'BOALNPKA', bankCodeCIPS = '2301', amount, remarks = 'HisabFlow' } = options;

  const formattedAmount = amount > 0 ? amount.toFixed(2) : '0.00';

  // Merchant Account Info (Tag 26 - NEPALPAY / connectIPS)
  const gui = formatTlv('00', 'np.gov.nchl.nepalpay');
  const merchantId = formatTlv('01', `${bankCodeCIPS}${accountNumber}`);
  const routing = formatTlv('02', bankCode);
  const tag26 = formatTlv('26', `${gui}${merchantId}${routing}`);

  // Additional Data (Tag 62 - Reference/Remarks)
  const tag62Ref = formatTlv('01', remarks.slice(0, 25));
  const tag62 = formatTlv('62', tag62Ref);

  let payload = '';
  payload += formatTlv('00', '01'); // Payload format indicator
  payload += formatTlv('01', '12'); // Point of Initiation: 12 = Dynamic QR
  payload += tag26;
  payload += formatTlv('52', '0000'); // Merchant category code
  payload += formatTlv('53', '524'); // Currency: NPR (524)
  if (amount > 0) {
    payload += formatTlv('54', formattedAmount); // Transaction Amount
  }
  payload += formatTlv('58', 'NP'); // Country Code
  payload += formatTlv('59', accountName.slice(0, 25).toUpperCase()); // Merchant/Account Name
  payload += formatTlv('60', 'Kathmandu'); // City
  payload += tag62;

  // CRC16 Checksum (Tag 63)
  const partial = payload + '6304';
  const checksum = calculateCrc16Ccitt(partial);
  return `${partial}${checksum}`;
}

/**
 * Generates Nepal Mobile Banking (NIC ASIA MoBank, connectIPS, Fonepay) JSON payload
 * containing account details, exact cart amount, and transaction remarks.
 */
export function buildMoBankJsonQr(options: DynamicQrPayloadOptions): string {
  const { accountName, accountNumber, bankCode = 'BOALNPKA', bankCodeCIPS = '2301', amount, remarks = 'HisabFlow POS' } = options;

  const payload: Record<string, unknown> = {
    accountNumber: accountNumber.trim(),
    accountName: accountName.trim(),
    bankCode: bankCode.trim(),
    bankCodeCIPS: bankCodeCIPS.trim(),
  };

  if (amount > 0) {
    payload.amount = Number(amount.toFixed(2));
    payload.txnAmount = Number(amount.toFixed(2));
  }

  if (remarks) {
    payload.remarks = remarks.slice(0, 30);
  }

  return JSON.stringify(payload, null, 2);
}

/**
 * Generates the dynamic payload string based on format preference.
 * Defaults to FONEPAY_DYNAMIC with pre-filled amount.
 */
export function generateDynamicQrPayload(options: DynamicQrPayloadOptions): string {
  if (options.format === 'EMVCO_NEPALPAY') {
    return buildEmvCoNepalQr(options);
  }
  if (options.format === 'MOBANK_JSON') {
    return buildMoBankJsonQr(options);
  }
  // Default: FONEPAY_DYNAMIC
  return buildFonepayDynamicQr(options);
}

/**
 * Renders a QR code data URL (PNG) with clean margins and error correction
 */
export async function generateQrDataUrl(
  text: string,
  options?: {
    width?: number;
    margin?: number;
    color?: { dark: string; light: string };
  }
): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    width: options?.width || 320,
    margin: options?.margin !== undefined ? options?.margin : 1,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
  });
}
