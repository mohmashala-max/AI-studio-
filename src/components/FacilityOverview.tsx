import React, { useState } from "react";
import { Sliders, Shield, AlertTriangle, CheckCircle2, Flame, MapPin } from "lucide-react";
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
  const [threshold, setThreshold] = useState<number>(facility.rule?.threshold || 5);
  const [cooldown, setCooldown] = useState<number>(facility.rule?.cooldown_minutes || 60);
  const [pestType, setPestType] = useState<string>(facility.rule?.pest_type || "any");
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
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 className="text-xl font-bold text-white tracking-tight">{facility.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
              {facility.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zone: {facility.zone}</span>
            <span className="mx-1">•</span>
            <span>Traps Monitored: {facility.traps.join(", ")}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEditRule ? (
            <button
              id="edit-rule-btn"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-semibold transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              {isEditing ? "Close Rule Editor" : "Configure Alert Rule"}
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic bg-slate-800/50 px-2.5 py-1 rounded border border-slate-700">
              Technician View: Alert rule locked
            </span>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
          <span className="text-xs text-slate-400 font-medium block">Pest Threshold</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-amber-400">{facility.rule?.threshold ?? 5}</span>
            <span className="text-xs text-slate-500">pests / reading</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Target: {facility.rule?.pest_type || "any pest"}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
          <span className="text-xs text-slate-400 font-medium block">Alarm Status</span>
          <div className="flex items-center gap-1.5 mt-1">
            {facility.rule?.enabled ? (
              <span className="inline-flex items-center gap-1 text-emerald-400 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400 text-sm font-semibold">
                Disabled
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Cooldown: {facility.rule?.cooldown_minutes ?? 60}m
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
          <span className="text-xs text-slate-400 font-medium block">Active Traps</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-slate-200">{facility.traps.length}</span>
            <span className="text-xs text-slate-500">units</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">YOLOv9 vision online</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-3">
          <span className="text-xs text-slate-400 font-medium block">Work Orders</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold text-rose-400">{workOrdersCount}</span>
            <span className="text-xs text-slate-500">dispatches</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">ERP sync active</span>
        </div>
      </div>

      {/* Inline Rule Editor Form */}
      {isEditing && (
        <form
          id="alert-rule-form"
          onSubmit={handleSave}
          className="mt-4 p-4 rounded-lg bg-slate-900/80 border border-emerald-500/30 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Facility Alert Rule Configuration (PUT /facilities/{facility.id}/alert-rule)
              </h3>
            </div>
            <span className="text-xs text-emerald-400 font-mono">SQLite / Multi-Tenant Store</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label htmlFor="pest-threshold-input" className="block text-slate-400 mb-1">
                Pest Threshold (Count)
              </label>
              <input
                id="pest-threshold-input"
                type="number"
                min="1"
                max="50"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500">Triggers ERP work order if exceeded</span>
            </div>

            <div>
              <label htmlFor="pest-type-select" className="block text-slate-400 mb-1">
                Pest Target Class
              </label>
              <select
                id="pest-type-select"
                value={pestType}
                onChange={(e) => setPestType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="any">Any Pest (Cockroach, Fly, Beetle)</option>
                <option value="cockroach">Cockroach only</option>
                <option value="fly">Fly only</option>
                <option value="beetle">Beetle only</option>
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
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500">Prevents alarm spamming</span>
            </div>

            <div>
              <label htmlFor="alarm-enabled-select" className="block text-slate-400 mb-1">
                Rule Activation
              </label>
              <select
                id="alarm-enabled-select"
                value={enabled ? "true" : "false"}
                onChange={(e) => setEnabled(e.target.value === "true")}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="true">Enabled (Autonomous ERP Dispatch)</option>
                <option value="false">Disabled (Monitoring Only)</option>
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
              className="px-4 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Policy to Database"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
