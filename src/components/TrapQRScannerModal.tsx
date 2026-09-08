import React, { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import {
  QrCode,
  Camera,
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Info,
  MapPin,
  Clock,
  Radio,
  Sparkles,
  History,
  Check,
} from "lucide-react";
import {
  PhysicalTrapMetadata,
  PHYSICAL_TRAPS_REGISTRY,
  parseTrapQRCode,
  ScannedTrapHistoryItem,
} from "../data/physicalTraps";

interface TrapQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrapSelected: (
    trap: PhysicalTrapMetadata,
    method?: "camera" | "photo_upload" | "preset_simulation" | "manual"
  ) => void;
  currentSelectedTrapId?: string;
  recentScanHistory?: ScannedTrapHistoryItem[];
}

export const TrapQRScannerModal: React.FC<TrapQRScannerModalProps> = ({
  isOpen,
  onClose,
  onTrapSelected,
  currentSelectedTrapId,
  recentScanHistory = [],
}) => {
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [detectedTrap, setDetectedTrap] = useState<PhysicalTrapMetadata | null>(null);
  const [detectedMethod, setDetectedMethod] = useState<
    "camera" | "photo_upload" | "preset_simulation" | "manual"
  >("camera");
  const [rawDecodedText, setRawDecodedText] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [showTestPresets, setShowTestPresets] = useState<boolean>(false);
  const [showRecentHistory, setShowRecentHistory] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound feedback on successful QR detection
  const playSuccessChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      }
    } catch {
      // AudioContext unavailable or restricted
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }
  }, []);

  // Stop camera stream cleanly
  const stopCameraStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Frame processing scan loop
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      const parsed = parseTrapQRCode(code.data);
      if (parsed) {
        playSuccessChime();
        setDetectedTrap(parsed);
        setDetectedMethod("camera");
        setRawDecodedText(code.data);
        // Do not request next frame; keep freeze on found code
        return;
      } else {
        // Detected non-trap QR code
        setRawDecodedText(code.data);
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [playSuccessChime]);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    setCameraError(null);
    stopCameraStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera device API is not supported in this browser environment.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings to scan physical trap QR codes.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera hardware found on this device. You can still test by uploading a QR image or clicking a test trap tag.");
      } else {
        setCameraError(`Camera error: ${err.message || "Unable to access video stream"}`);
      }
      setIsCameraActive(false);
    }
  }, [facingMode, scanFrame, stopCameraStream]);

  // Toggle camera direction (front vs rear)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Process uploaded QR code photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const parsed = parseTrapQRCode(code.data);
            if (parsed) {
              playSuccessChime();
              setDetectedTrap(parsed);
              setDetectedMethod("photo_upload");
              setRawDecodedText(code.data);
            } else {
              setRawDecodedText(code.data);
              setCameraError(`Decoded QR: "${code.data}" is not a recognized warehouse trap ID.`);
            }
          } else {
            setCameraError("No readable QR code found in the uploaded photo. Please ensure clear lighting and focus.");
          }
        }
        setIsProcessingImage(false);
      };
      img.onerror = () => {
        setCameraError("Failed to parse image file.");
        setIsProcessingImage(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Life-cycle management on open / close
  useEffect(() => {
    if (isOpen) {
      setDetectedTrap(null);
      setRawDecodedText(null);
      startCameraStream();
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCameraStream, stopCameraStream]);

  // Handle trap confirmation
  const handleConfirmTrap = (trap: PhysicalTrapMetadata) => {
    onTrapSelected(trap, detectedMethod);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="qr-scanner-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="qr-scanner-modal-card"
        className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Physical Trap QR Scanner
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Live Vision
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Aim device camera at the physical QR tag on the warehouse pheromone trap
              </p>
            </div>
          </div>
          <button
            id="close-qr-scanner-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Camera Viewport */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Camera Viewport Canvas */}
          <div className="relative aspect-4/3 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            {/* Hidden canvas for off-screen QR decoding */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Video element streaming device camera */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${
                detectedTrap ? "brightness-75" : ""
              }`}
              muted
              playsInline
            />

            {/* Targeting Reticle & Laser Sweep Animation */}
            {isCameraActive && !detectedTrap && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Target box */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-amber-400/40 rounded-2xl">
                  {/* Corner Accent Brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-amber-400 rounded-tl-md" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-amber-400 rounded-tr-md" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-amber-400 rounded-bl-md" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-amber-400 rounded-br-md" />

                  {/* Laser Scan Bar Animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-lg shadow-amber-400/80 animate-bounce" />

                  {/* Center reticle crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-30">
                    <div className="w-4 h-0.5 bg-amber-400" />
                    <div className="h-4 w-0.5 bg-amber-400 absolute" />
                  </div>
                </div>

                {/* Subtitle HUD */}
                <div className="absolute bottom-3 inset-x-0 flex justify-center">
                  <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700 text-xs text-amber-300 font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    Scanning for Serricornin Trap QR...
                  </span>
                </div>
              </div>
            )}

            {/* Camera Controls Overlay */}
            {isCameraActive && (
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  id="toggle-camera-facing-btn"
                  onClick={toggleFacingMode}
                  className="p-2 rounded-lg bg-slate-900/85 backdrop-blur-md text-slate-200 border border-slate-700 hover:bg-slate-800 transition cursor-pointer"
                  title="Switch camera (rear / front)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Error or No Camera Fallback State */}
            {cameraError && !isCameraActive && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="p-3 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-sm font-bold text-white">Camera Offline or Inaccessible</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={startCameraStream}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
                  >
                    Retry Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition cursor-pointer"
                  >
                    Upload QR Image
                  </button>
                </div>
              </div>
            )}

            {/* Detected Trap Success Card Overlay */}
            {detectedTrap && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200">
                <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mb-3 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Physical Trap Identified
                </span>
                <h4 className="text-lg font-extrabold text-white mt-0.5">{detectedTrap.name}</h4>
                <p className="text-xs text-slate-300 font-mono mt-1">{detectedTrap.qrCodeValue}</p>

                <div className="w-full max-w-sm bg-slate-900/80 border border-slate-700/80 rounded-xl p-3 my-3 text-left space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Location:
                    </span>
                    <span className="font-medium text-slate-200">{detectedTrap.pillarLocation}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      Lure Age:
                    </span>
                    <span className="font-medium text-slate-200">
                      {detectedTrap.lureAgeDays} days active ({detectedTrap.lureBatch})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Radio className="w-3.5 h-3.5 text-purple-400" />
                      Paired Sensor:
                    </span>
                    <span className="font-mono text-emerald-400">{detectedTrap.pairedSensorId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full max-w-sm">
                  <button
                    id="confirm-scanned-trap-btn"
                    onClick={() => handleConfirmTrap(detectedTrap)}
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition cursor-pointer"
                  >
                    Select This Trap
                  </button>
                  <button
                    onClick={() => {
                      setDetectedTrap(null);
                      setRawDecodedText(null);
                      startCameraStream();
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition cursor-pointer"
                  >
                    Rescan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Upload / File Scan Option */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>{isProcessingImage ? "Decoding Photo..." : "Scan from Photo File"}</span>
            </button>

            <button
              onClick={() => setShowTestPresets(!showTestPresets)}
              className="text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showTestPresets ? "Hide Test Barcodes" : "Simulate / Test Traps"}</span>
            </button>
          </div>

          {/* Warehouse Physical Traps Test Matrix */}
          {showTestPresets && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  Warehouse Physical Traps (Click to Simulate Scan):
                </span>
                <span className="text-[10px] text-slate-500 font-mono">4 Enrolled</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(PHYSICAL_TRAPS_REGISTRY).map((trap) => {
                  const isCurrent = trap.id === currentSelectedTrapId;
                  return (
                    <button
                      key={trap.id}
                      onClick={() => {
                        playSuccessChime();
                        setDetectedTrap(trap);
                        setRawDecodedText(trap.qrCodeValue);
                      }}
                      className={`p-2.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        isCurrent
                          ? "bg-amber-500/10 border-amber-500/50 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{trap.name}</span>
                        <span className="font-mono text-[10px] text-amber-400">
                          {trap.qrCodeValue}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate">
                        {trap.pillarLocation}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {trap.lureType} • Lure: {trap.lureAgeDays}d
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Barcode / QR Decoder: jsQR v1.4.0 High-Speed
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
