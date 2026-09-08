import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Cpu,
  AlertOctagon,
  CheckCircle,
  FileText,
  Sliders,
  Sparkles,
  Layers,
} from "lucide-react";
import { InspectionResult, Detection, FacilityInfo } from "../types";

interface InspectionStudioProps {
  facility: FacilityInfo;
  token: string;
  onInspectionCompleted: (result: InspectionResult) => void;
}

// Preset trap mock image representations with SVG/Canvas overlays
const SAMPLE_PRESETS = [
  {
    id: "preset-high",
    title: "High Infestation (Threshold Exceeded)",
    description: "4 cockroaches + 1 beetle detected in corner trap bait",
    image: "trap-high-pest",
    trapId: "trap-1",
    detections: [
      { label: "cockroach", confidence: 0.96, area_ratio: 0.034, bbox: [22, 28, 16, 14] as [number, number, number, number] },
      { label: "cockroach", confidence: 0.91, area_ratio: 0.028, bbox: [45, 35, 14, 12] as [number, number, number, number] },
      { label: "cockroach", confidence: 0.88, area_ratio: 0.022, bbox: [62, 58, 15, 13] as [number, number, number, number] },
      { label: "cockroach", confidence: 0.85, area_ratio: 0.029, bbox: [30, 68, 17, 15] as [number, number, number, number] },
      { label: "beetle", confidence: 0.82, area_ratio: 0.019, bbox: [78, 25, 13, 11] as [number, number, number, number] },
    ],
  },
  {
    id: "preset-low",
    title: "Normal Trap Reading",
    description: "1 cockroach + 1 fly (Under threshold)",
    image: "trap-low-pest",
    trapId: "trap-2",
    detections: [
      { label: "cockroach", confidence: 0.92, area_ratio: 0.026, bbox: [35, 45, 16, 14] as [number, number, number, number] },
      { label: "fly", confidence: 0.79, area_ratio: 0.012, bbox: [68, 30, 11, 9] as [number, number, number, number] },
    ],
  },
  {
    id: "preset-clean",
    title: "Clean / Neutral Trap",
    description: "Pheromone pad fresh, 0 pests identified",
    image: "trap-clean",
    trapId: "trap-2",
    detections: [],
  },
];

export const InspectionStudio: React.FC<InspectionStudioProps> = ({
  facility,
  token,
  onInspectionCompleted,
}) => {
  const [selectedTrap, setSelectedTrap] = useState<string>(facility.traps[0] || "trap-1");
  const [selectedPreset, setSelectedPreset] = useState<string>("preset-high");
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<InspectionResult | null>(null);
  const [customThreshold, setCustomThreshold] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = SAMPLE_PRESETS.find((p) => p.id === selectedPreset);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/v1/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Image upload failed");
      }

      const data = await res.json();
      setCustomImageUri(data.image_uri);
      setSelectedPreset("custom");
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const runInspection = async () => {
    setIsInspecting(true);
    try {
      let detections: Detection[] | undefined;

      if (selectedPreset !== "custom" && activePreset) {
        detections = activePreset.detections;
      }

      const payload: any = {
        facility_id: facility.id,
        trap_id: selectedTrap,
        image_uri: customImageUri || (activePreset ? `preset://${activePreset.image}` : "mock://trap"),
      };

      if (detections) {
        payload.detections = detections;
      }

      if (customThreshold.trim() !== "") {
        payload.threshold = parseInt(customThreshold, 10);
      }

      const res = await fetch("/api/v1/ai/inspect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Inference failed");
      }

      const result: InspectionResult = await res.json();
      setLastResult(result);
      onInspectionCompleted(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsInspecting(false);
    }
  };

  // Determine which detections to draw on the trap canvas
  const displayedDetections: Detection[] =
    lastResult?.detections ||
    (selectedPreset !== "custom" && activePreset ? activePreset.detections : []);

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              AI Vision Inspection Terminal
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono">
              YOLOv9 + SAM2
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time inference pipeline validating pest counts against facility alarm rules
          </p>
        </div>

        {/* Trap Selection & Threshold override */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 mr-1.5">Target Trap:</span>
            <select
              id="trap-selector"
              value={selectedTrap}
              onChange={(e) => setSelectedTrap(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {facility.traps.map((t) => (
                <option key={t} value={t} className="bg-slate-900 text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 mr-1.5">Rule Threshold:</span>
            <span className="text-amber-400 font-bold mr-1">
              {facility.rule?.threshold ?? 5}
            </span>
            <input
              id="custom-threshold-input"
              type="text"
              placeholder="Override"
              value={customThreshold}
              onChange={(e) => setCustomThreshold(e.target.value)}
              className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white text-[11px] focus:outline-none"
              title="Leave blank to use facility rule"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Viewport vs Controls & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Interactive Visual Canvas (Trap Viewport) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-700/80 overflow-hidden flex items-center justify-center shadow-inner group">
            {/* Background Grid Pattern simulating trap inspection chamber */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(#34d399 1px, transparent 1px), radial-gradient(#64748b 1px, #020617 1px)",
                backgroundSize: "24px 24px",
                backgroundPosition: "0 0, 12px 12px",
              }}
            />

            {/* Simulated Trap Chamber Surface */}
            <div className="absolute inset-4 rounded-lg border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/95 flex flex-col items-center justify-center p-4">
              {customImageUri ? (
                <img
                  src={customImageUri}
                  alt="Custom trap observation"
                  className="w-full h-full object-contain rounded"
                />
              ) : (
                <div className="text-center select-none space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400">
                    <Camera className="w-8 h-8 text-emerald-400/80" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-300 block">
                      Trap Station: {selectedTrap}
                    </span>
                    <span className="text-xs text-slate-500 font-mono block">
                      Camera Stream: Active / 1920x1080 / 30fps
                    </span>
                  </div>
                </div>
              )}

              {/* Bounding Box Overlays */}
              {displayedDetections.map((det, idx) => {
                const [x = 20 + idx * 15, y = 30 + idx * 10, w = 15, h = 12] =
                  det.bbox || [];
                return (
                  <div
                    key={idx}
                    className="absolute border-2 border-amber-400 bg-amber-400/15 rounded transition-all duration-300 animate-pulse hover:bg-amber-400/30"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${w}%`,
                      height: `${h}%`,
                    }}
                  >
                    <div className="absolute -top-5 left-0 bg-amber-500 text-slate-950 text-[10px] font-bold px-1 py-0.5 rounded shadow whitespace-nowrap">
                      {det.label} ({Math.round(det.confidence * 100)}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Status Overlay Badges */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-slate-700 text-[10px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                LIVE SENSOR
              </span>
              <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-slate-300">
                FOV: 94°
              </span>
            </div>

            {/* Bounding Box Count Overlay */}
            <div className="absolute bottom-2 right-2 z-10">
              <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[11px] text-slate-300 font-mono">
                Detected Objects: {displayedDetections.length}
              </span>
            </div>
          </div>

          {/* Quick Presets & File Upload Controls */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium block">
              Inspection Presets & Source Media:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  id={`preset-btn-${preset.id}`}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setCustomImageUri(null);
                    setSelectedTrap(preset.trapId);
                  }}
                  className={`text-left p-2.5 rounded-lg border text-xs transition ${
                    selectedPreset === preset.id && !customImageUri
                      ? "bg-emerald-950/40 border-emerald-500/80 text-white shadow"
                      : "bg-slate-900/60 border-slate-700/60 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="font-semibold">{preset.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom File Upload Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                id="upload-custom-img-btn"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                {isUploading ? "Uploading..." : "Upload Trap Image (POST /api/v1/images)"}
              </button>
              {customImageUri && (
                <span className="text-[11px] text-emerald-400 font-mono">
                  Custom image loaded
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Trigger Button, AI Detections & ERP Work Order Dispatch */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Run Button */}
            <button
              id="run-inspect-btn"
              onClick={runInspection}
              disabled={isInspecting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              <Cpu className={`w-4 h-4 ${isInspecting ? "animate-spin" : ""}`} />
              {isInspecting
                ? "Running YOLOv9 + SAM2 Inference..."
                : "Run AI Vision Inspection"}
            </button>

            {/* Detection Summary Card */}
            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Model Output Detections
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {lastResult ? lastResult.model_version : "yolov9-v1+sam2-v1"}
                </span>
              </div>

              {displayedDetections.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  No pests detected in active frame. Trap clean.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {displayedDetections.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="font-semibold text-slate-200 capitalize">
                          {d.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-slate-400">
                          conf:{" "}
                          <strong className="text-emerald-400">
                            {Math.round(d.confidence * 100)}%
                          </strong>
                        </span>
                        <span className="text-slate-500">
                          area: {(d.area_ratio * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Threshold & ERP Dispatch Outcome */}
            {lastResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  lastResult.threshold_exceeded
                    ? "bg-rose-950/30 border-rose-500/50 text-rose-200"
                    : "bg-emerald-950/30 border-emerald-500/50 text-emerald-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {lastResult.threshold_exceeded ? (
                      <>
                        <AlertOctagon className="w-4 h-4 text-rose-400" />
                        <span>Threshold Exceeded: Alarm Triggered</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>Within Normal Tolerance</span>
                      </>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-black/40">
                    Count: {lastResult.pest_count} pests
                  </span>
                </div>

                {lastResult.work_order ? (
                  <div className="mt-2 pt-2 border-t border-rose-500/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        Autonomous ERP Work Order Created:
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                        Priority: {lastResult.work_order.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300">
                      ID: {lastResult.work_order.work_order_id}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Reason: {lastResult.work_order.reason}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px]">
                    No action required. Facility pest count is below alarm threshold.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
