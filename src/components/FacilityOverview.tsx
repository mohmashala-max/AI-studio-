import React, { useState } from "react";
import {
  Sliders,
  Shield,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Thermometer,
  Droplets,
  Clock,
  Sparkles,
} from "lucide-react";
import { FacilityInfo, AlertRule, UserRole } from "../types";

interface FacilityOverviewProps {
  facility: FacilityInfo;
  role: UserRole;
  onUpdateRule: (facilityId: string, rule: AlertRule) => Promise<void>;
  workOrdersCount: number;
}

export const FacilityOverview: React.FC<FacilityOverviewProps> = ({
  facility,
  role,
  onUpdateRule,
  workOrdersCount,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [threshold, setThreshold] = useState<number>(facility.rule?.threshold || 3);
  const [cooldown, setCooldown] = useState<number>(facility.rule?.cooldown_minutes || 60);
  const [pestType, setPestType] = useState<string>(facility.rule?.pest_type || "tobacco_beetle");
  const [enabled, setEnabled] = useState<boolean>(facility.rule?.enabled ?? true);
  const [saving, setSaving] = useState(false);

  const canEditRule = role === "admin_executive" || role === "facility_manager";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateRule(facility.id, {
        facility_id: facility.id,
        threshold,
        cooldown_minutes: cooldown,
        pest_type: pestType,
        enabled,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 className="text-xl font-bold text-white tracking-tight">{facility.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {facility.id}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Zone: <strong className="text-slate-200">{facility.zone}</strong>
            </span>
            <span>•</span>
            <span>Traps: {facility.traps.join(", ")}</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">Sensirion SHT31 Connected</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEditRule ? (
            <button
              id="edit-rule-btn"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              {isEditing ? "Close Threshold Policy" : "Configure Baseline & Thresholds"}
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic bg-slate-800/50 px-2.5 py-1 rounded border border-slate-700">
              Technician View: Alert rule locked
            </span>
          )}
        </div>
      </div>

      {/* Facility Key Environmental & Operational Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Baseline & Catch Threshold */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 font-medium block">Baseline Threshold</span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-extrabold text-amber-400">
              {facility.baseline_count || facility.rule?.threshold || 3}
            </span>
            <span className="text-xs text-slate-500">beetles/dusk</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Override if count &gt; 3x baseline ({((facility.baseline_count || 3) * 3)})
          </span>
        </div>

        {/* Microclimate Temperature (SHT31) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
            Microclimate Temp
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold text-rose-300">
              {facility.current_temperature ?? 32.8}°C
            </span>
            <span className="text-xs text-slate-500">(SHT31)</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Optimal breeding: 30-37°C
          </span>
        </div>

        {/* Microclimate Humidity (SHT31) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            Relative Humidity
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-extrabold ${
                (facility.current_humidity || 67) >= 70
                  ? "text-rose-400"
                  : (facility.current_humidity || 67) >= 60
                  ? "text-amber-400"
                  : "text-cyan-400"
              }`}
            >
              {facility.current_humidity ?? 67.2}%
            </span>
            <span className="text-xs text-slate-500">RH</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Weight: 35% (Zero &lt;55%, Max &gt;70%)
          </span>
        </div>

        {/* Serricornin Lure & Dusk Schedule */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            Serricornin Lure
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-extrabold text-purple-300">
              {facility.serricornin_lure_age_days ?? 21}d
            </span>
            <span className="text-xs text-slate-500">active</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Dusk trigger: 19:42 UTC
          </span>
        </div>
      </div>

      {/* Inline Rule Editor Form */}
      {isEditing && (
        <form
          id="alert-rule-form"
          onSubmit={handleSave}
          className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Tobacco Beetle Alert Policy &amp; Baseline Config ({facility.id})
              </h3>
            </div>
            <span className="text-xs text-amber-400 font-mono">Sensirion + Serricornin Rule</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label htmlFor="pest-threshold-input" className="block text-slate-400 mb-1">
                Baseline Count (Threshold)
              </label>
              <input
                id="pest-threshold-input"
                type="number"
                min="1"
                max="50"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500">Jump &gt;3x baseline forces Critical Alert</span>
            </div>

            <div>
              <label htmlFor="pest-type-select" className="block text-slate-400 mb-1">
                Target Pest Classification
              </label>
              <select
                id="pest-type-select"
                value={pestType}
                onChange={(e) => setPestType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="tobacco_beetle">Lasioderma serricorne (Tobacco Beetle)</option>
                <option value="drugstore_beetle">Stegobium paniceum (Drugstore Beetle)</option>
                <option value="any">Any Stored Product Pest</option>
              </select>
            </div>

            <div>
              <label htmlFor="cooldown-input" className="block text-slate-400 mb-1">
                Cooldown Window (Minutes)
              </label>
              <input
                id="cooldown-input"
                type="number"
                min="5"
                max="1440"
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500">Cooldown between dispatch alerts</span>
            </div>

            <div>
              <label htmlFor="alarm-enabled-select" className="block text-slate-400 mb-1">
                Policy Activation
              </label>
              <select
                id="alarm-enabled-select"
                value={enabled ? "true" : "false"}
                onChange={(e) => setEnabled(e.target.value === "true")}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="true">Active (Autonomous Alert Dispatch)</option>
                <option value="false">Monitoring Only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              id="cancel-rule-btn"
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              id="save-rule-btn"
              type="submit"
              disabled={saving}
              className="px-4 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Baseline Policy"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
