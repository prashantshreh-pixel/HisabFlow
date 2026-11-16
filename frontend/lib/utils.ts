/**
 * Sanitizes user form input against XSS injection, control characters, and em dashes.
 */
export function sanitizeInput(input: string | undefined | null, maxLength = 500): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>?/gm, "")
    .replace(/javascript:/gi, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[\u2014\u2013]/g, "-")
    .trim()
    .slice(0, maxLength);
}

/**
 * Escapes HTML special characters to prevent XSS in generated print templates.
 */
export function escapeHtml(input: string | undefined | null): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Normalizes customer or business names to Clean Title Case.
 * Handles uppercase entries, lowercases, and preserves initials.
 */
export function formatPersonName(name: string): string {
  if (!name || typeof name !== "string") return "";
  const trimmed = sanitizeInput(name, 100);
  return trimmed
    .split(/\s+/)
    .map((word) => {
      if (word.length <= 1) return word.toUpperCase();
      if (["POS", "SKU", "QR", "VAT", "PAN"].includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Standardized currency formatter for Rupee amounts.
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "Rs. 0";
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
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

          resolve(compressedFile);
        } catch {
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
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed) return new Date();
    if (!trimmed.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(trimmed)) {
      const parsed = new Date(`${trimmed}Z`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const standard = new Date(trimmed);
    return isNaN(standard.getTime()) ? new Date() : standard;
  }
  return new Date();
}

/**
 * Formats a date into localized time string (e.g. "02:03 PM")
 */
export function formatLocalTime(dateVal: string | Date | undefined | null): string {
  const d = parseApiDate(dateVal);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Plays synthesized POS audio feedback via Web Audio API (no external audio files needed).
 */
export function playPosSound(type: "beep" | "error" | "checkout" = "beep"): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "beep") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
      setTimeout(() => ctx.close().catch(() => {}), 200);
      navigator.vibrate?.([40]);
    } else if (type === "error") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
      setTimeout(() => ctx.close().catch(() => {}), 350);
      navigator.vibrate?.([80, 40, 80]);
    } else if (type === "checkout") {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1318.5, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.28);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.28);
      setTimeout(() => ctx.close().catch(() => {}), 400);
      navigator.vibrate?.([50, 30, 60]);
    }
  } catch {
    // Ignore if browser autoplay policy blocks audio before user interaction
  }
}
