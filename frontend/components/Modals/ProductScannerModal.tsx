'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { productsApi, BarcodeLookupResponse } from '@/lib/api';
import { Product } from '@/types';
import { compressImageFile } from '@/lib/utils';
import {
  X,
  Camera,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ScanLine,
  Image as ImageIcon,
  Zap,
  ArrowRight,
  Boxes,
} from 'lucide-react';

export interface ScannedProductDraft {
  barcode: string;
  name?: string;
  brand?: string;
  category?: string;
  unit?: string;
  imageUrl?: string;
  description?: string;
  netWeight?: string;
  existingProduct?: Product;
}

interface ProductScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductScanned: (data: ScannedProductDraft) => void;
  onEditExistingProduct?: (product: Product) => void;
}

/**
 * Renders an image file onto an offscreen canvas at a given rotation (0, 90, 180, 270)
 * and optional contrast enhancement.
 */
async function renderRotatedCanvas(
  file: File,
  angle: number,
  enhance = false
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const isSideways = angle === 90 || angle === 270;
      canvas.width = isSideways ? img.height : img.width;
      canvas.height = isSideways ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      if (enhance) {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          // Apply binarization / high-contrast thresholding for faint/shiny packaging
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const v = gray > 130 ? 255 : 0;
            d[i] = v;
            d[i + 1] = v;
            d[i + 2] = v;
          }
          ctx.putImageData(imgData, 0, 0);
        } catch {
          // ignore canvas pixel manipulation if tainted
        }
      }

      resolve(canvas);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(e);
    };
    img.src = objectUrl;
  });
}

/**
 * Converts a canvas element to a File object.
 */
function canvasToFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new File([], filename));
        return;
      }
      resolve(new File([blob], filename, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Robust multi-orientation barcode extractor.
 * 1. Native BarcodeDetector (instant, angle-agnostic)
 * 2. Multi-orientation ZXing scan via html5-qrcode at 0°, 90°, 270°, 180°
 * 3. Contrast-enhanced scan for high-glare or low-contrast barcodes
 */
async function extractBarcodeFromImage(file: File): Promise<string | null> {
  // 1. Try native browser BarcodeDetector if available
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'itf']
      });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close?.();
      if (results && results.length > 0 && results[0]?.rawValue) {
        return results[0].rawValue.trim();
      }
    } catch (e) {
      console.debug('Native BarcodeDetector direct scan failed, continuing to multi-rotation:', e);
    }
  }

  const scanner = new Html5Qrcode('hisabflow-hidden-file-scanner', { verbose: false });

  try {
    // 2. Multi-orientation scan (0, 90, 270, 180 degrees)
    const angles = [0, 90, 270, 180];
    for (const angle of angles) {
      try {
        let testFile = file;
        if (angle !== 0) {
          const canvas = await renderRotatedCanvas(file, angle, false);
          // Try native detector on rotated canvas if available
          if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
              });
              const results = await detector.detect(canvas);
              if (results && results.length > 0 && results[0]?.rawValue) {
                return results[0].rawValue.trim();
              }
            } catch {}
          }
          testFile = await canvasToFile(canvas, `rot-${angle}-${file.name}`);
        }

        const decoded = await scanner.scanFile(testFile, false);
        if (decoded && decoded.trim()) {
          return decoded.trim();
        }
      } catch {
        // angle didn't match, continue to next orientation
      }
    }

    // 3. Fallback: Contrast enhancement at 0° and 90° for shiny or washed-out packaging
    for (const angle of [0, 90]) {
      try {
        const canvas = await renderRotatedCanvas(file, angle, true);
        const enhancedFile = await canvasToFile(canvas, `enh-${angle}-${file.name}`);
        const decoded = await scanner.scanFile(enhancedFile, false);
        if (decoded && decoded.trim()) {
          return decoded.trim();
        }
      } catch {
        // ignore
      }
    }
  } finally {
    try {
      scanner.clear();
    } catch {}
  }

  return null;
}

export const ProductScannerModal: React.FC<ProductScannerModalProps> = ({
  isOpen,
  onClose,
  onProductScanned,
  onEditExistingProduct,
}) => {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'UPLOAD'>(() => {
    if (typeof window !== 'undefined') {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768;
      return isMobile ? 'CAMERA' : 'UPLOAD';
    }
    return 'UPLOAD';
  });
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResponse | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'hisabflow-barcode-reader';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Reset modal state helper
  const handleClose = useCallback(() => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
        html5QrCodeRef.current.clear();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setLookupResult(null);
    setScannerError(null);
    setLastScannedBarcode(null);
    setUploadedPreview(null);
    setUploadedImageUrl(null);
    onClose();
  }, [onClose]);

  // Play pleasant success chime via Web Audio API
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      navigator.vibrate?.([60]);
    } catch {
      // AudioContext unavailable or blocked by autoplay
    }
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
        setIsScanning(false);
      }
    }
  }, []);

  // Handle successful barcode extraction
  const handleBarcodeFound = useCallback(
    async (barcode: string, customImageUrl?: string) => {
      const clean = barcode.trim();
      if (!clean) return;

      playBeep();
      setLastScannedBarcode(clean);
      setLookupLoading(true);
      setScannerError(null);

      // Stop camera once barcode is found so viewfinder pauses
      await stopCamera();

      try {
        const lookup = await productsApi.lookupBarcode(clean);
        setLookupResult(lookup);

        const img = customImageUrl || lookup.data?.imageUrl || undefined;

        if (lookup.source === 'LOCAL_INVENTORY' && lookup.product) {
          // Found in local inventory
          // We let the merchant choose to edit it or view
        } else {
          // New product or recognized from open catalog
          // Wait a short moment for visual confirmation, then trigger product draft
          setTimeout(() => {
            onProductScanned({
              barcode: clean,
              name: lookup.data?.name || undefined,
              brand: lookup.data?.brand || undefined,
              category: lookup.data?.category || 'Packaged Foods & Snacks',
              unit: lookup.data?.unit || 'pcs',
              imageUrl: img,
              description: lookup.data?.description || undefined,
              netWeight: lookup.data?.netWeight || undefined,
            });
            onClose();
          }, 800);
        }
      } catch (err: any) {
        console.warn('Barcode lookup failed:', err);
        // Fallback: provide raw barcode
        setTimeout(() => {
          onProductScanned({
            barcode: clean,
            category: 'Packaged Foods & Snacks',
            unit: 'pcs',
            imageUrl: customImageUrl,
          });
          onClose();
        }, 500);
      } finally {
        setLookupLoading(false);
      }
    },
    [playBeep, stopCamera, onProductScanned, onClose]
  );

  // Start live camera stream
  const startCamera = useCallback(async () => {
    setScannerError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId, { verbose: false });
      }

      await html5QrCodeRef.current.start(
        { facingMode: cameraFacing },
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Wide rectangle optimized for 1D barcodes and 2D QR codes
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const width = Math.floor(minEdge * 0.85);
            const height = Math.floor(width * 0.65);
            return { width: Math.max(250, width), height: Math.max(160, height) };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleBarcodeFound(decodedText);
        },
        () => {
          // ignore transient decode attempts
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setIsScanning(false);
      const msg =
        err?.name === 'NotAllowedError' || err?.message?.includes('Permission')
          ? 'Camera permission was denied. Please allow camera permissions in your browser or switch to image upload.'
          : 'Unable to start camera. Please verify device camera access or upload a photo instead.';
      setScannerError(msg);
    }
  }, [cameraFacing, handleBarcodeFound]);

  // Manage camera on tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA') {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Clean up when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  // Handle uploaded or captured image file
  const handleProcessImageFile = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScannerError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setScannerError(null);
    setLookupLoading(true);

    const objectUrl = URL.createObjectURL(file);
    setUploadedPreview(objectUrl);

    try {
      // 1. Upload the image to store server in background for product catalog thumbnail
      let savedImageUrl: string | undefined;
      try {
        const compressed = await compressImageFile(file, 1000, 1000, 0.82);
        const uploadRes = await productsApi.uploadImage(compressed);
        savedImageUrl = uploadRes.imageUrl;
        setUploadedImageUrl(savedImageUrl);
      } catch (uploadErr) {
        console.warn('Image upload error:', uploadErr);
      }

      // 2. Decode barcode from image with multi-orientation (0°, 90°, 270°, 180°) and native BarcodeDetector
      const decodedBarcode = await extractBarcodeFromImage(file);

      if (decodedBarcode) {
        await handleBarcodeFound(decodedBarcode, savedImageUrl);
      } else {
        // Fallback: If no barcode was decoded from image, prompt user with option to use image for manual product
        setScannerError(
          'Could not detect a clear barcode from this image. Ensure the barcode is sharp, well-lit, and not cropped.'
        );
        setLookupLoading(false);
      }
    } catch (err: any) {
      console.error('Image processing error:', err);
      setScannerError(err.message || 'Failed to process image file.');
      setLookupLoading(false);
    }
  }, [handleBarcodeFound]);

  // Clipboard paste support on Desktop
  useEffect(() => {
    if (!isOpen || activeTab !== 'UPLOAD') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, activeTab, handleProcessImageFile]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hidden container for file decoding */}
        <div id="hisabflow-hidden-file-scanner" className="hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-surface-raised/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                Scan Product & Auto-fill
              </h3>
              <p className="text-xs text-muted-foreground">
                Read barcode from camera or uploaded packaging image
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Switcher Tabs */}
        <div className="px-5 pt-3 pb-2 bg-surface">
          <div className="flex rounded-xl bg-surface-raised/60 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('CAMERA')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'CAMERA'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Live Camera (Mobile)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UPLOAD')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'UPLOAD'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload / Photo (Web)</span>
            </button>
          </div>
        </div>

        {/* Scanner Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* CAMERA TAB */}
          {activeTab === 'CAMERA' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-square flex items-center justify-center border border-border/80 shadow-inner">
                {/* HTML5 QR Code Mount */}
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Laser Overlay Bar when Scanning */}
                {isScanning && !lookupLoading && (
                  <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse pointer-events-none" />
                )}

                {/* Loading / Processing Overlay */}
                {lookupLoading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 text-white">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-sm font-medium">Recognizing Barcode & Product...</span>
                  </div>
                )}
              </div>

              {/* Mobile Quick Action Buttons: Flip camera & Native Camera Snapshot */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
                    setTimeout(() => startCamera(), 200);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-border bg-surface-raised/40 hover:bg-surface-raised text-xs font-medium text-foreground transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Flip Camera
                </button>

                {/* Native Mobile Camera Capture Trigger */}
                <input
                  type="file"
                  ref={mobileCameraInputRef}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleProcessImageFile(f);
                  }}
                />
                <button
                  type="button"
                  onClick={() => mobileCameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Photo Directly
                </button>
              </div>
            </div>
          )}

          {/* UPLOAD / WEB TAB */}
          {activeTab === 'UPLOAD' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProcessImageFile(f);
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleProcessImageFile(f);
                }}
                className="cursor-pointer border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-surface-raised/20 hover:bg-surface-raised/40 transition-all group"
              >
                {uploadedPreview ? (
                  <div className="space-y-3 flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedPreview}
                      alt="Uploaded packaging"
                      className="max-h-48 rounded-xl object-contain shadow-md border border-border"
                    />
                    <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                      Click or drop another image to replace
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <ImageIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Drag & drop product photo or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supports PNG, JPG, WEBP • You can also press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono">Ctrl+V</kbd> to paste
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {lookupLoading && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs font-medium text-primary animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing image & recognizing product...
                </div>
              )}
            </div>
          )}

          {/* Feedback & Error Alerts */}
          {scannerError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{scannerError}</span>
                {uploadedPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      onProductScanned({
                        barcode: '',
                        imageUrl: uploadedImageUrl || uploadedPreview,
                        category: 'Packaged Foods & Snacks',
                        unit: 'pcs',
                      });
                      onClose();
                    }}
                    className="mt-2 block font-semibold text-primary hover:underline"
                  >
                    Continue adding product with this photo anyway &rarr;
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Found in Store Inventory Alert */}
          {lookupResult?.source === 'LOCAL_INVENTORY' && lookupResult.product && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Product Already Exists in Store
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{lookupResult.product.name}</strong> (Barcode:{' '}
                {lookupResult.product.barcode}) is already registered with {lookupResult.product.stockQuantity}{' '}
                {lookupResult.product.unit} in stock.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onEditExistingProduct && lookupResult.product) {
                      onEditExistingProduct({
                        id: lookupResult.product.id,
                        name: lookupResult.product.name,
                        category: lookupResult.product.category,
                        unit: (lookupResult.product.unit || 'pcs') as any,
                        costPrice: lookupResult.product.costPrice,
                        sellingPrice: lookupResult.product.sellingPrice,
                        stockQuantity: lookupResult.product.stockQuantity,
                        minStockAlert: lookupResult.product.minStockAlert,
                        barcode: lookupResult.product.barcode || undefined,
                        imageUrl: lookupResult.product.imageUrl || undefined,
                        brand: lookupResult.product.brand || undefined,
                        description: lookupResult.product.description || undefined,
                        updatedAt: lookupResult.product.updatedAt || new Date().toISOString(),
                      });
                    }
                    onClose();
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  Edit / Adjust Stock
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-border bg-surface-raised/20 flex items-center justify-between text-xs text-muted-foreground">
          <span>Supports EAN-13, EAN-8, UPC, Code 128, & QR Codes</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg border border-border hover:bg-surface-raised text-foreground font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
