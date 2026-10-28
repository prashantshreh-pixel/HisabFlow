import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes customer or business names to Clean Title Case.
 * Handles uppercase entries, lowercases, and preserves initials.
 */
export function formatPersonName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  // Check if ALL CAPS or mixed lower/upper
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 1) return word.toUpperCase();
      // Keep acronyms like POS or SKU
      if (['POS', 'SKU', 'QR', 'VAT', 'PAN'].includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Standardized currency formatter for Rupee amounts.
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rs. 0';
  return `Rs. ${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Resizes the image to fit within maxWidth / maxHeight and converts it to JPEG format.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          const parts = dataUrl.split(",");
          const byteString = atob(parts[1]);
          const mimeString = parts[0].split(":")[1].split(";")[0];

          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }

          const blob = new Blob([ab], { type: mimeString });
          const lastDot = file.name.lastIndexOf(".");
          const baseName = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
          const compressedFileName = `${baseName}_compressed.jpg`;

          const compressedFile = new File([blob], compressedFileName, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          console.log(
            `Image compressed: ${(file.size / 1024).toFixed(1)} KB -> ${(compressedFile.size / 1024).toFixed(1)} KB`
          );
          resolve(compressedFile);
        } catch (err) {
          console.error("Canvas compression failed, using original file:", err);
          resolve(file);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Safely parses any API date string into a local Date object.
 * When the server returns UTC dates without a trailing 'Z' (e.g. from SQL Server),
 * this appends 'Z' so the browser accurately converts it to the user's local timezone.
 */
export function parseApiDate(dateVal: string | Date | undefined | null): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? new Date() : dateVal;
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return new Date();
    // If it doesn't already have Z or a timezone offset like +05:45, append Z
    if (!trimmed.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}Z`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const standard = new Date(trimmed);
    return isNaN(standard.getTime()) ? new Date() : standard;
  }
  return new Date();
}

/**
 * Formats a date into localized date string (e.g. "Oct 28, 2026")
 */
export function formatLocalDate(dateVal: string | Date | undefined | null, options?: Intl.DateTimeFormatOptions): string {
  const d = parseApiDate(dateVal);
  return d.toLocaleDateString('en-US', options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date into localized time string (e.g. "02:03 PM")
 */
export function formatLocalTime(dateVal: string | Date | undefined | null): string {
  const d = parseApiDate(dateVal);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

