import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Cpu,
  AlertOctagon,
  CheckCircle,
  Clock,
  Sparkles,
  Layers,
  HelpCircle,
  Eye,
  Microscope,
} from "lucide-react";
import { InspectionResult, Detection, FacilityInfo } from "../types";

interface InspectionStudioProps {
  facility: FacilityInfo;
  token: string;
  onInspectionCompleted: (result: InspectionResult) => void;
}

// Presets focused on Tobacco Beetle (Lasioderma serricorne) vs Drugstore Beetle (Stegobium paniceum)
const TOBACCO_BEETLE_PRESETS = [
  {
    id: "preset-tb-spike",
    title: "Dusk Catch: Lasioderma serricorne Surge",
    description: "6 adult tobacco beetles (serrate antennae) + 1 drugstore beetle on Serricornin pad",
    trapId: "trap-tb-01",
    detections: [
      {
        label: "Lasioderma serricorne (Tobacco Beetle)",
        confidence: 0.96,
        area_ratio: 0.024,
        source: "YOLOv8-nano",
        bbox: [22, 26, 16, 14] as [number, number, number, number],
        antennae_type: "serrate" as const,
        elytra_texture: "smooth_pubescent" as const,
      },
      {
        label: "Lasioderma serricorne (Tobacco Beetle)",
        confidence: 0.94,
        area_ratio: 0.022,
        source: "YOLOv8-nano",
        bbox: [46, 32, 15, 13] as [number, number, number, number],
        antennae_type: "serrate" as const,
        elytra_texture: "smooth_pubescent" as const,
      },
      {
        label: "Lasioderma serricorne (Tobacco Beetle)",
        confidence: 0.91,
        area_ratio: 0.021,
        source: "YOLOv8-nano",
        bbox: [68, 54, 15, 13] as [number, number, number, number],
        antennae_type: "serrate" as const,
        elytra_texture: "smooth_pubescent" as const,
      },
      {
        label: "Lasioderma serricorne (Tobacco Beetle)",
        confidence: 0.89,
        area_ratio: 0.025,
        source: "YOLOv8-nano",
        bbox: [28, 66, 16, 14] as [number, number, number, number],
        antennae_type: "serrate" as const,
        elytra_texture: "smooth_pubescent" as const,
      },
      {
        label: "Lasioderma serricorne (Tobacco Beetle)",
        confidence: 0.92,
        area_ratio: 0.023,
        source: "YOLOv8-nano",
        bbox: [74, 24, 14, 12] as [number, number, number, number],
        antennae_type: "serrate" as const,
        elytra_texture: "smooth_pubescent" as const,
      },
      {
        label: "Lasioderma serricorne (Tobacco Beetle)",
        confidence: 0.88,
        area_ratio: 0.020,
        source: "YOLOv8-nano",
        bbox: [52, 70, 15, 13] as [number, number, number, number],
        antennae_type: "serrate" as const,
        elytra_texture: "smooth_pubescent" as const,
      },
      {
        label: "Stegobium paniceum (Drugstore Beetle)",
        confidence: 0.84,
        area_ratio: 0.018,
        source: "YOLOv8-nano",
        bbox: [38, 44, 14, 12] as [number, number, number, number],
        antennae_type: "clubbed" as const,
        elytra_texture: "striate_punctate" as const,
      },
    ],
  },
  {
    id: "preset-tb-mixed",
    title: "Morphology Discrimination: Tobacco vs Drugstore",
    description: "Comparing saw-toothed vs 3-segmented club antennae and smooth vs grooved elytra",
    trapId: "trap-tb-02",
    detections: [
      {
        label: "Lasioderma serricorne (Tobacco Beetle)",
        confidence: 0.95,
        area_ratio: 0.025,
        source: "YOLOv8-nano",
        bbox: [30, 36, 18, 16] as [number, number, number, number],
        antennae_type: "serrate" as const,
        elytra_texture: "smooth_pubescent" as const,
      },
      {
        label: "Stegobium paniceum (Drugstore Beetle)",
        confidence: 0.91,
        area_ratio: 0.022,
        source: "YOLOv8-nano",
        bbox: [62, 40, 17, 15] as [number, number, number, number],
        antennae_type: "clubbed" as const,
        elytra_texture: "striate_punctate" as const,
      },
    ],
  },
  {
    id: "preset-tb-clean",
    title: "Clean Baseline: Fresh Serricornin Lure",
    description: "Active Serricornin pheromone pad, 0 beetles trapped",
    trapId: "trap-tb-01",
    detections: [],
  },
];

export const InspectionStudio: React.FC<InspectionStudioProps> = ({
  facility,
  token,
  onInspectionCompleted,
}) => {
  const [selectedTrap, setSelectedTrap] = useState<string>(facility.traps[0] || "trap-tb-01");
  const [selectedPreset, setSelectedPreset] = useState<string>("preset-tb-spike");
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<InspectionResult | null>(null);
  const [customThreshold, setCustomThreshold] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = TOBACCO_BEETLE_PRESETS.find((p) => p.id === selectedPreset);

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
        image_uri: customImageUri || (activePreset ? `preset://${activePreset.id}` : "mock://trap"),
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

  const displayedDetections =
    lastResult?.detections || (activePreset ? activePreset.detections : []);

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Studio Header & Dusk Trigger Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Microscope className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              YOLOv8-nano Tobacco Beetle Vision &amp; Dusk Trap Chamber
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Fine-tuned on <em>Lasioderma serricorne</em> morphology • Single daily photo at dusk (peak activity) • Commercial Serricornin lure
          </p>
        </div>

        {/* Dusk Camera Schedule & Serricornin Lure Badge */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-950 border border-purple-800 text-purple-300">
            <Clock className="w-3.5 h-3.5" />
            Dusk Trigger: 19:42 UTC (at sunset)
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
            Lure: Serricornin #L-402 (19d active)
          </span>
        </div>
      </div>

      {/* Main Grid: Trap Camera Canvas vs Morphology & Inference Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Trap Observation Viewport */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="relative aspect-video w-full rounded-xl bg-slate-950 border border-slate-700 overflow-hidden flex items-center justify-center shadow-inner group">
            {/* Background Grid Pattern simulating glue pad */}
            <div
              className="absolute inset-0 opacity-25"
              style={{
                backgroundImage:
                  "radial-gradient(#f59e0b 1px, transparent 1px), radial-gradient(#64748b 1px, #020617 1px)",
                backgroundSize: "28px 28px",
                backgroundPosition: "0 0, 14px 14px",
              }}
            />

            {/* Pheromone Trap Chamber Base */}
            <div className="absolute inset-4 rounded-lg border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/95 flex flex-col items-center justify-center p-4">
              {customImageUri ? (
                <img
                  src={customImageUri}
                  alt="Custom trap observation"
                  className="w-full h-full object-contain rounded"
                />
              ) : (
                <div className="text-center select-none space-y-2">
                  <div className="inline-flex p-3 rounded-full bg-slate-800/60 border border-slate-700 text-amber-400">
                    <Camera className="w-8 h-8 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-200 block">
                      Pheromone Trap: {selectedTrap}
                    </span>
                    <span className="text-xs text-slate-400 font-mono block">
                      Dusk Exposure: 19:42:15 UTC • Serricornin Pad Chamber
                    </span>
                  </div>
                </div>
              )}

              {/* Bounding Box Overlays */}
              {displayedDetections.map((det, idx) => {
                const [x = 20 + idx * 12, y = 25 + idx * 10, w = 15, h = 13] =
                  det.bbox || [];
                const isTobacco =
                  det.label.includes("Tobacco") || det.label.includes("Lasioderma");

                return (
                  <div
                    key={idx}
                    className={`absolute border-2 rounded transition-all duration-300 animate-pulse ${
                      isTobacco
                        ? "border-amber-400 bg-amber-400/20"
                        : "border-sky-400 bg-sky-400/20"
                    }`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${w}%`,
                      height: `${h}%`,
                    }}
                  >
                    <div
                      className={`absolute -top-6 left-0 text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap ${
                        isTobacco
                          ? "bg-amber-500 text-slate-950"
                          : "bg-sky-500 text-slate-950"
                      }`}
                    >
                      {isTobacco ? "L. serricorne" : "S. paniceum"} ({Math.round(det.confidence * 100)}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Camera Badges */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[10px] text-slate-300 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                DUSK CAPTURE ARCHIVE
              </span>
              <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-amber-300">
                LURE: SERRICORNIN
              </span>
            </div>

            <div className="absolute bottom-2 right-2 z-10">
              <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[11px] text-slate-300 font-mono">
                Pests Identified: {displayedDetections.length}
              </span>
            </div>
          </div>

          {/* Preset Selection Buttons */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium block">
              Sample Dusk Photos &amp; Morphology Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TOBACCO_BEETLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    setCustomImageUri(null);
                    setLastResult(null);
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    selectedPreset === preset.id
                      ? "bg-amber-500/10 border-amber-500/60 text-white"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="font-bold block text-white">{preset.title}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 line-clamp-2">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Inspection Controls & Morphological Analysis Results */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Run Button & Controls */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">YOLOv8-nano Classifier</span>
                <span className="text-[11px] font-mono text-emerald-400">Lasioderma v8.2</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="run-ai-inspect-btn"
                  onClick={runInspection}
                  disabled={isInspecting}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  <Cpu className="w-4 h-4" />
                  {isInspecting ? "Analyzing Dusk Morphology..." : "Execute YOLOv8 Inspection"}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Upload Field Trap Photo"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Morphology Classification Card: Lasioderma vs Stegobium */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-200 font-bold border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Morphological Distinction Guide
                </span>
                <span className="text-[10px] text-slate-500">Section 2 &amp; 3</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 space-y-1">
                  <div className="font-bold text-amber-300">Lasioderma serricorne</div>
                  <div className="text-slate-300">
                    • <strong>Antennae:</strong> Saw-toothed (serrate)
                  </div>
                  <div className="text-slate-300">
                    • <strong>Elytra:</strong> Smooth with fine hairs
                  </div>
                  <div className="text-slate-300">
                    • <strong>Head:</strong> Bent down, humped look
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <div className="font-bold text-sky-300">Stegobium paniceum</div>
                  <div className="text-slate-400">
                    • <strong>Antennae:</strong> 3-segmented club
                  </div>
                  <div className="text-slate-400">
                    • <strong>Elytra:</strong> Distinct grooved lines (striate)
                  </div>
                  <div className="text-slate-400">
                    • <strong>Habitat:</strong> Stored bread/grain
                  </div>
                </div>
              </div>
            </div>

            {/* Inference Outcome Display */}
            {lastResult && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">Inference Summary</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lastResult.alert_level === "critical"
                        ? "bg-rose-950 text-rose-300 border border-rose-700"
                        : lastResult.alert_level === "warning"
                        ? "bg-amber-950 text-amber-300 border border-amber-700"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                    }`}
                  >
                    {lastResult.alert_level.toUpperCase()} ALERT
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-400 block">Tobacco Beetles:</span>
                    <strong className="text-amber-400 text-sm">{lastResult.tobacco_beetle_count}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Drugstore Beetles:</span>
                    <strong className="text-sky-400 text-sm">{lastResult.drugstore_beetle_count}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Composite Risk Score:</span>
                    <strong className="text-white text-sm">{lastResult.risk_score} / 100</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Est. Hidden Larvae:</span>
                    <strong className="text-purple-300 text-sm">~{lastResult.hidden_larval_estimate}</strong>
                  </div>
                </div>

                {lastResult.work_order && (
                  <div className="p-2 rounded bg-rose-950/40 border border-rose-800/60 text-rose-200 text-[11px] mt-2">
                    <strong>Recommended Field Action:</strong> {lastResult.work_order.recommended_action}
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
