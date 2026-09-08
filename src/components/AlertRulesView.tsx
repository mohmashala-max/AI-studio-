import React, { useState, useEffect } from "react";
import { Sliders, CheckCircle2, ShieldAlert, Save, RefreshCw } from "lucide-react";
import { AlertRule, UserSession } from "../types";

interface AlertRulesViewProps {
  session: UserSession;
  facilityId: string;
  onRuleUpdated: (rule: AlertRule) => void;
}

export const AlertRulesView: React.FC<AlertRulesViewProps> = ({ session, facilityId, onRuleUpdated }) => {
  const [rule, setRule] = useState<AlertRule>({
    facility_id: facilityId,
    pest_type: "any",
    threshold: 5,
    cooldown_minutes: 60,
    enabled: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canEdit = ["admin_executive", "facility_manager"].includes(session.role);

  const fetchRule = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/facilities/${facilityId}/alert-rule`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load facility alert rule");
      const data: AlertRule = await res.json();
      setRule(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRule();
  }, [facilityId, session.token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      setErrorMsg("Your current role does not have permission to modify alert rules.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      const res = await fetch(`/api/v1/facilities/${facilityId}/alert-rule`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(rule),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update alert rule");
      }

      const updated: AlertRule = await res.json();
      setRule(updated);
      onRuleUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          Facility Alert Rule & Action Threshold
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Automated threshold triggers for facility <span className="font-mono text-slate-200">{facilityId}</span>. When detected density meets or exceeds the threshold during an AI inspection, an ERP Work Order is automatically generated.
        </p>
      </div>

      {!canEdit && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-lg text-amber-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            Read-only mode: Only <strong>Facility Managers</strong> and <strong>Admin Executives</strong> can modify alert rules. Switch role in the header to edit.
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
          {errorMsg}
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Alert rule saved and broadcasted to inspection pipeline!
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-slate-800/80 border border-slate-700 rounded-xl p-6 space-y-6">
        {/* Enable / Disable */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-700">
          <div>
            <label className="font-medium text-slate-200 text-sm block">Rule Status</label>
            <p className="text-xs text-slate-400">Enable or pause automated threshold triggers for this facility</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="rule-enabled-toggle"
              checked={rule.enabled}
              disabled={!canEdit}
              onChange={(e) => setRule({ ...rule, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Threshold */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="rule-threshold-input" className="text-sm font-medium text-slate-200">
              Pest Count Threshold (Critical Trigger)
            </label>
            <span className="font-mono text-lg font-bold text-amber-400">{rule.threshold} pests</span>
          </div>
          <input
            id="rule-threshold-input"
            type="range"
            min={1}
            max={20}
            value={rule.threshold}
            disabled={!canEdit}
            onChange={(e) => setRule({ ...rule, threshold: parseInt(e.target.value, 10) || 1 })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <p className="text-xs text-slate-400">
            Work orders are flagged as <span className="text-rose-400 font-semibold">HIGH PRIORITY</span> if pest count reaches twice this threshold ({rule.threshold * 2}+ pests).
          </p>
        </div>

        {/* Pest Type Target */}
        <div className="space-y-2">
          <label htmlFor="rule-pest-type" className="text-sm font-medium text-slate-200 block">
            Target Pest Classification
          </label>
          <select
            id="rule-pest-type"
            value={rule.pest_type}
            disabled={!canEdit}
            onChange={(e) => setRule({ ...rule, pest_type: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="any">Any Pest (Cockroach, Fly, Moth, Beetle, Rodent)</option>
            <option value="cockroach">Cockroach Only (Blattodea)</option>
            <option value="fly">Fly Only (Diptera)</option>
            <option value="moth">Stored Product Moth (Lepidoptera)</option>
            <option value="rodent">Rodent Only (Muridae)</option>
          </select>
        </div>

        {/* Cooldown Period */}
        <div className="space-y-2">
          <label htmlFor="rule-cooldown-input" className="text-sm font-medium text-slate-200 block">
            Alert Cooldown Window (Minutes)
          </label>
          <input
            id="rule-cooldown-input"
            type="number"
            min={5}
            max={1440}
            step={5}
            value={rule.cooldown_minutes}
            disabled={!canEdit}
            onChange={(e) => setRule({ ...rule, cooldown_minutes: parseInt(e.target.value, 10) || 60 })}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
          <p className="text-xs text-slate-400">
            Prevents duplicate consecutive ERP work order creation within this timeframe.
          </p>
        </div>

        {canEdit && (
          <div className="pt-4 border-t border-slate-700 flex justify-end">
            <button
              id="save-rule-btn"
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition shadow-lg shadow-amber-950/40 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving Rule..." : "Save Alert Rule"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
