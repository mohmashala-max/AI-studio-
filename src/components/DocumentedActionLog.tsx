import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertOctagon,
  FileCheck,
  Plus,
  TrendingDown,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";
import { DocumentedAction, AlertLevel, UserRole } from "../types";

interface DocumentedActionLogProps {
  facilityId: string;
  token: string;
  role: UserRole;
}

export const DocumentedActionLog: React.FC<DocumentedActionLogProps> = ({
  facilityId,
  token,
  role,
}) => {
  const [actions, setActions] = useState<DocumentedAction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [measuringAction, setMeasuringAction] = useState<DocumentedAction | null>(null);

  // Form states for new action
  const [trapId, setTrapId] = useState<string>("trap-tb-01");
  const [actionType, setActionType] = useState<DocumentedAction["action_type"]>("cooling_ventilation");
  const [actionTitle, setActionTitle] = useState<string>("");
  const [actionDetails, setActionDetails] = useState<string>("");
  const [alertLevel, setAlertLevel] = useState<AlertLevel>("warning");
  const [riskScore, setRiskScore] = useState<number>(68);
  const [preCount, setPreCount] = useState<number>(6);
  const [saving, setSaving] = useState<boolean>(false);

  // Form states for measuring impact
  const [postCount, setPostCount] = useState<number>(1);
  const [impactNotes, setImpactNotes] = useState<string>("");
  const [measuringSaving, setMeasuringSaving] = useState<boolean>(false);

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/facilities/${facilityId}/actions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setActions(data);
      }
    } catch (err) {
      console.error("Failed to load actions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [facilityId, token]);

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        trap_id: trapId,
        alert_level: alertLevel,
        risk_score: riskScore,
        trigger_reason: `${alertLevel.toUpperCase()} Risk Alert (Score ${riskScore}) detected at Serricornin trap ${trapId}`,
        action_type: actionType,
        action_title:
          actionTitle ||
          (actionType === "phosphine_fumigation"
            ? "Phosphine Gas (PH3) Stack Fumigation"
            : actionType === "dehumidification"
            ? "Forced Desiccant Dehumidification & Aeration"
            : actionType === "batch_isolation"
            ? "Suspect Bale Batch Quarantine & Plastic Wrap"
            : "HVAC Cooling & Exhaust Ventilation"),
        action_details: actionDetails,
        pre_action_count: preCount,
      };

      const res = await fetch(`/api/v1/facilities/${facilityId}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowLogModal(false);
        setActionTitle("");
        setActionDetails("");
        fetchActions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImpact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!measuringAction) return;
    setMeasuringSaving(true);
    try {
      const res = await fetch(
        `/api/v1/facilities/${facilityId}/actions/${measuringAction.action_id}/measure`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            post_action_count: postCount,
            notes:
              impactNotes ||
              `Follow-up inspection at 18 days confirms count dropped from ${measuringAction.pre_action_count} to ${postCount} adults. Target achieved.`,
          }),
        }
      );

      if (res.ok) {
        setMeasuringAction(null);
        fetchActions();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMeasuringSaving(false);
    }
  };

  const totalClosed = actions.filter((a) => a.status === "impact_measured_closed").length;
  const closedPct = actions.length > 0 ? Math.round((totalClosed / actions.length) * 100) : 100;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <FileCheck className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Documented Field Action Log &amp; 15-20 Day Impact Tracker
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tobacco Beetle Protocol: Every alert is closed with a documented action and mandatory 15-20 day follow-up efficacy measurement (Target: 100%)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-xs text-emerald-300 font-mono">
            <span>Impact Measured Rate:</span>
            <strong className="text-white text-sm">{closedPct}%</strong>
            <span className="text-[10px] text-emerald-400">({totalClosed}/{actions.length})</span>
          </div>

          <button
            id="open-log-action-modal-btn"
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Field Action
          </button>
        </div>
      </div>

      {/* Actions Table / List */}
      <div className="space-y-3">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
            No documented field actions recorded yet for this facility.
          </div>
        ) : (
          actions.map((act) => {
            const isClosed = act.status === "impact_measured_closed";
            return (
              <div
                key={act.action_id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 transition hover:border-slate-700"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        act.alert_level === "critical"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : act.alert_level === "warning"
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                      }`}
                    >
                      {act.alert_level.toUpperCase()} (Score: {act.risk_score})
                    </span>
                    <h4 className="text-sm font-bold text-white">{act.action_title}</h4>
                    <span className="text-xs text-slate-500 font-mono">[{act.trap_id}]</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isClosed ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Impact Measured: {act.reduction_pct}% Drop
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-amber-300 font-mono bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/80">
                          <Clock className="w-3.5 h-3.5" />
                          Due for follow-up: {act.follow_up_date}
                        </span>
                        <button
                          onClick={() => {
                            setMeasuringAction(act);
                            setPostCount(Math.max(0, Math.round(act.pre_action_count * 0.2)));
                          }}
                          className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Record 15-20d Impact
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-xs">
                  <div>
                    <span className="text-slate-500 block font-mono text-[10px]">REASON &amp; INTERVENTION</span>
                    <p className="text-slate-300 mt-0.5">{act.trigger_reason}</p>
                    <p className="text-slate-400 text-[11px] mt-1">{act.action_details}</p>
                  </div>

                  <div>
                    <span className="text-slate-500 block font-mono text-[10px]">METRICS BEFORE ACTION</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-slate-200">Pre-Action Count:</span>
                      <strong className="text-amber-400 font-bold text-sm">
                        {act.pre_action_count} adults
                      </strong>
                    </div>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Logged by {act.logged_by} on {new Date(act.logged_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block font-mono text-[10px]">15-20 DAY EFFICACY RESULT</span>
                    {isClosed ? (
                      <div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className="text-slate-200">Post-Action Count:</span>
                          <strong className="text-emerald-400 font-bold text-sm">
                            {act.post_action_count_15d} adults
                          </strong>
                          <span className="text-emerald-300 text-[11px] font-bold">
                            (-{act.reduction_pct}%)
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-1 italic">
                          "{act.impact_measurement_notes}"
                        </p>
                      </div>
                    ) : (
                      <div className="text-amber-400/90 text-[11px] mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Awaiting 15-20 day emergence window to measure reduction.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Log New Field Action */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Log Tobacco Beetle Remediation Action</h4>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Target Trap Location</label>
                  <select
                    value={trapId}
                    onChange={(e) => setTrapId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="trap-tb-01">trap-tb-01 (Bay 3, High-Pheromone Lure)</option>
                    <option value="trap-tb-02">trap-tb-02 (Stack Row 4, Flue Cured)</option>
                    <option value="trap-tb-03">trap-tb-03 (Fermentation Conditioning)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Trigger Alert Level</label>
                  <select
                    value={alertLevel}
                    onChange={(e) => setAlertLevel(e.target.value as AlertLevel)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    <option value="warning">Warning (60 - 79)</option>
                    <option value="critical">Critical (80 - 100)</option>
                    <option value="watch">Watch (30 - 59)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Remediation Action Type</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="phosphine_fumigation">
                    Phosphine Gas (PH3) Fumigation (Critical Alert Protocol)
                  </option>
                  <option value="dehumidification">
                    Desiccant Dehumidification (Drop RH &lt;55% to break breeding)
                  </option>
                  <option value="cooling_ventilation">
                    Cooling &amp; Forced Exhaust Airflow
                  </option>
                  <option value="batch_isolation">
                    Tobacco Bale Quarantine &amp; Plastic Tarp Isolation
                  </option>
                  <option value="sample_dissection">
                    Leaf Sample Pull &amp; Manual Larval Dissection
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Action Title</label>
                <input
                  type="text"
                  placeholder="e.g. Phosphine Tarp Fumigation on Bay 3 Bales"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Field Execution Details</label>
                <textarea
                  rows={3}
                  placeholder="Specify dosages (e.g. 300 ppm PH3 for 96h), seal integrity, ventilation rate, or affected bale batch IDs..."
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Pre-Action Adult Count</label>
                  <input
                    type="number"
                    min="1"
                    value={preCount}
                    onChange={(e) => setPreCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Benchmark for 15-20d follow-up</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Current Risk Score</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={riskScore}
                    onChange={(e) => setRiskScore(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Log Action & Schedule 18-Day Follow-up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record 15-20 Day Impact Measurement */}
      {measuringAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <h4 className="text-base font-bold text-white">Record 15-20 Day Efficacy Impact</h4>
              </div>
              <button
                onClick={() => setMeasuringAction(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="text-slate-300 font-bold">{measuringAction.action_title}</div>
              <div className="text-slate-400">
                Pre-Action Count: <strong className="text-amber-400">{measuringAction.pre_action_count} adults</strong>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Logged on {new Date(measuringAction.logged_at).toLocaleDateString()} • Scheduled Follow-up: {measuringAction.follow_up_date}
              </div>
            </div>

            <form onSubmit={handleSaveImpact} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Post-Action Count (at 15-20 Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max={measuringAction.pre_action_count * 2}
                  value={postCount}
                  onChange={(e) => setPostCount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold text-sm"
                  required
                />
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Calculated Reduction:</span>
                  <span className="text-emerald-400 font-bold">
                    {Math.round(
                      Math.max(
                        0,
                        ((measuringAction.pre_action_count - postCount) /
                          measuringAction.pre_action_count) *
                          100
                      )
                    )}
                    % Drop
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Impact Measurement Verification Notes</label>
                <textarea
                  rows={3}
                  placeholder="Record adult catch reduction, visual check of bale surfaces, and absence of active larvae in tobacco leaf sample..."
                  value={impactNotes}
                  onChange={(e) => setImpactNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMeasuringAction(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={measuringSaving}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50"
                >
                  {measuringSaving ? "Saving Impact..." : "Verify & Close Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
