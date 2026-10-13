import QRCode from 'qrcode';

export interface DynamicQrPayloadOptions {
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  bankCodeCIPS?: string;
  bankName?: string;
  amount: number;
  remarks?: string;
  format?: 'MOBANK_JSON' | 'EMVCO_NEPALPAY';
}

/**
 * Calculates CRC-16 CCITT (polynomial 0x1021, initial value 0xFFFF)
 * as required by the EMVCo / NepalQR specification.
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

  const payload: Record<string, any> = {
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
 * Generates the dynamic payload string based on format preference
 */
export function generateDynamicQrPayload(options: DynamicQrPayloadOptions): string {
  if (options.format === 'EMVCO_NEPALPAY') {
    return buildEmvCoNepalQr(options);
  }
  return buildMoBankJsonQr(options);
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
