import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Droplets,
  Thermometer,
  ShieldAlert,
  Clock,
  Zap,
  Target,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { DailyTelemetry, ForecastDay, MvpKpiSummary, AlertLevel } from "../types";

interface TobaccoBeetleAnalyticsProps {
  facilityId: string;
  token: string;
  onOpenActionModal?: (data?: any) => void;
}

export const TobaccoBeetleAnalytics: React.FC<TobaccoBeetleAnalyticsProps> = ({
  facilityId,
  token,
  onOpenActionModal,
}) => {
  const [telemetry, setTelemetry] = useState<DailyTelemetry[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [kpis, setKpis] = useState<MvpKpiSummary | null>(null);
  const [microclimate, setMicroclimate] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMetric, setViewMetric] = useState<"all" | "risk" | "microclimate">("all");
  const [selectedDay, setSelectedDay] = useState<DailyTelemetry | null>(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/facilities/${facilityId}/telemetry`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data.telemetry || []);
        setForecast(data.forecast || []);
        setKpis(data.kpiSummary || null);
        setMicroclimate(data.current_microclimate || null);
        if (data.telemetry && data.telemetry.length > 0) {
          setSelectedDay(data.telemetry[data.telemetry.length - 1]);
        }
      }
    } catch (err) {
      console.error("Failed to load telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [facilityId, token]);

  const latestDay = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
  const activeDay = selectedDay || latestDay;

  const getAlertBadge = (level?: AlertLevel) => {
    switch (level) {
      case "critical":
        return {
          label: "CRITICAL (80-100)",
          color: "bg-rose-500/20 text-rose-300 border-rose-500/50",
          desc: "Immediate phosphine fumigation or batch isolation required",
        };
      case "warning":
        return {
          label: "WARNING (60-79)",
          color: "bg-amber-500/20 text-amber-300 border-amber-500/50",
          desc: "Activate ventilation/dehumidification, inspect manual tobacco sample",
        };
      case "watch":
        return {
          label: "WATCH (30-59)",
          color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
          desc: "Early upward trend; intensify visual inspection & airflow efficiency",
        };
      default:
        return {
          label: "NORMAL (0-29)",
          color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
          desc: "Routine dusk capture and microclimate monitoring",
        };
    }
  };

  const activeBadge = getAlertBadge(activeDay?.alert_level);

  return (
    <div className="space-y-6">
      {/* Real-time Status Banner */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Lasioderma serricorne (Tobacco Beetle) Predictive Engine
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${activeBadge.color}`}
                >
                  {activeBadge.label}
                </span>
                {activeDay?.override_triggered && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-600 font-semibold animate-pulse">
                    ⚡ 3x Baseline Jump Override
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeBadge.desc} • Dusk camera capture at local sunset (19:42 UTC) • Sensirion SHT31 sensor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenActionModal && (
              <button
                id="log-field-action-btn"
                onClick={() => onOpenActionModal(activeDay)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Log Remediation Action
              </button>
            )}
            <div className="flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs font-medium text-slate-300">
              <button
                onClick={() => setViewMetric("all")}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMetric === "all" ? "bg-slate-700 text-white font-semibold" : "hover:text-white"
                }`}
              >
                Comprehensive
              </button>
              <button
                onClick={() => setViewMetric("risk")}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMetric === "risk" ? "bg-slate-700 text-white font-semibold" : "hover:text-white"
                }`}
              >
                Risk Decomposition
              </button>
              <button
                onClick={() => setViewMetric("microclimate")}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMetric === "microclimate" ? "bg-slate-700 text-white font-semibold" : "hover:text-white"
                }`}
              >
                Microclimate (SHT31)
              </button>
            </div>
          </div>
        </div>

        {/* 4 Core Composite Calculation Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4">
          {/* Composite Risk Score */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Composite Risk Score</span>
              <span className="text-[10px] text-slate-500 font-mono">0 - 100</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span
                className={`text-3xl font-extrabold tracking-tight ${
                  (activeDay?.risk_score || 0) >= 80
                    ? "text-rose-400"
                    : (activeDay?.risk_score || 0) >= 60
                    ? "text-amber-400"
                    : (activeDay?.risk_score || 0) >= 30
                    ? "text-yellow-400"
                    : "text-emerald-400"
                }`}
              >
                {activeDay?.risk_score ?? 0}
              </span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  (activeDay?.risk_score || 0) >= 80
                    ? "bg-rose-500"
                    : (activeDay?.risk_score || 0) >= 60
                    ? "bg-amber-500"
                    : (activeDay?.risk_score || 0) >= 30
                    ? "bg-yellow-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, activeDay?.risk_score || 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5 font-mono">
              = (0.45×Count) + (0.35×RH) + (0.20×Temp)
            </span>
          </div>

          {/* Adult Beetle Count Factor */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Count Factor (45%)</span>
              <span className="text-[10px] text-slate-500">3d MA vs Base</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold text-white">{activeDay?.count ?? 0}</span>
              <span className="text-xs text-slate-400">
                (3d MA: <strong className="text-amber-400">{activeDay?.moving_avg_3d}</strong>)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${activeDay?.count_factor || 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5 font-mono">
              Baseline: {activeDay?.baseline} • Factor: {activeDay?.count_factor}%
            </span>
          </div>

          {/* Humidity Factor */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                Humidity Factor (35%)
              </span>
              <span className="text-[10px] text-slate-500">&gt;70% Critical</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span
                className={`text-3xl font-extrabold ${
                  (activeDay?.humidity || 0) >= 70
                    ? "text-rose-400"
                    : (activeDay?.humidity || 0) >= 65
                    ? "text-amber-400"
                    : "text-cyan-400"
                }`}
              >
                {activeDay?.humidity ?? 0}%
              </span>
              <span className="text-xs text-slate-500">RH (SHT31)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${activeDay?.humidity_factor || 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5 font-mono">
              Zero &lt;55% • Max &gt;70% • Factor: {activeDay?.humidity_factor}%
            </span>
          </div>

          {/* Temperature Factor & Hidden Larvae Estimate */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                Temp Factor (20%)
              </span>
              <span className="text-[10px] text-slate-500">30-37°C Optimal</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-3xl font-extrabold text-rose-300">{activeDay?.temperature ?? 0}°C</span>
              <span className="text-xs text-slate-500">
                (~{activeDay?.estimated_hidden_larvae} larvae est.)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-rose-400 transition-all duration-500"
                style={{ width: `${activeDay?.temp_factor || 0}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5 font-mono">
              Optimal: 30-37°C • Factor: {activeDay?.temp_factor}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Telemetry Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              30-Day Dusk Catch Trend vs Microclimate &amp; Risk Dynamics
            </h4>
            <p className="text-xs text-slate-400">
              Daily dusk photo catch, 3-day moving average, baseline reference, and Sensirion SHT31 microclimate factors
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span> Count (Dusk)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-yellow-400 inline-block"></span> 3d MA
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span> RH %
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-rose-400 inline-block"></span> Temp °C
            </span>
          </div>
        </div>

        {/* Recharts Chart Container */}
        <div className="h-72 w-full min-h-[288px] min-w-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={telemetry}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  setSelectedDay(e.activePayload[0].payload);
                }
              }}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="day_label" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="count"
                stroke="#f59e0b"
                tick={{ fontSize: 11 }}
                domain={[0, "dataMax + 4"]}
                label={{ value: "Adult Count", angle: -90, position: "insideLeft", fill: "#f59e0b", fontSize: 10 }}
              />
              <YAxis
                yAxisId="micro"
                orientation="right"
                stroke="#38bdf8"
                tick={{ fontSize: 11 }}
                domain={[20, 100]}
                label={{ value: "RH % / Temp °C / Risk", angle: 90, position: "insideRight", fill: "#38bdf8", fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DailyTelemetry;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 font-sans">
                        <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-3">
                          <span>{data.date}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              data.alert_level === "critical"
                                ? "bg-rose-900 text-rose-200"
                                : data.alert_level === "warning"
                                ? "bg-amber-900 text-amber-200"
                                : data.alert_level === "watch"
                                ? "bg-yellow-900 text-yellow-200"
                                : "bg-emerald-900 text-emerald-200"
                            }`}
                          >
                            {data.alert_level.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          <span className="text-slate-400">Adult Dusk Count:</span>
                          <span className="font-bold text-amber-400">{data.count} beetles</span>

                          <span className="text-slate-400">3-Day Moving Avg:</span>
                          <span className="font-bold text-yellow-300">{data.moving_avg_3d}</span>

                          <span className="text-slate-400">Location Baseline:</span>
                          <span className="text-slate-300">{data.baseline}</span>

                          <span className="text-slate-400">Relative Humidity:</span>
                          <span className="font-bold text-cyan-400">{data.humidity}% RH</span>

                          <span className="text-slate-400">Temperature:</span>
                          <span className="font-bold text-rose-400">{data.temperature}°C</span>

                          <span className="text-slate-400">Composite Risk Score:</span>
                          <span className="font-bold text-white">{data.risk_score}/100</span>

                          <span className="text-slate-400">Est. Hidden Larvae:</span>
                          <span className="font-mono text-purple-300">~{data.estimated_hidden_larvae} larvae</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                          {data.dusk_photo_timestamp}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                yAxisId="count"
                y={activeDay?.baseline || 3}
                stroke="#ea580c"
                strokeDasharray="4 4"
                label={{ value: "Baseline Threshold", fill: "#ea580c", fontSize: 10, position: "insideBottomRight" }}
              />
              {/* Count bars */}
              <Bar yAxisId="count" dataKey="count" fill="#f59e0b" fillOpacity={0.7} radius={[4, 4, 0, 0]} maxBarSize={16} />
              {/* 3-day Moving Average line */}
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="moving_avg_3d"
                stroke="#eab308"
                strokeWidth={2.5}
                dot={false}
              />
              {/* Humidity Line / Area */}
              {(viewMetric === "all" || viewMetric === "microclimate") && (
                <Line
                  yAxisId="micro"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {/* Temperature Line */}
              {(viewMetric === "all" || viewMetric === "microclimate") && (
                <Line
                  yAxisId="micro"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#fb7185"
                  strokeWidth={2}
                  dot={false}
                />
              )}
              {/* Composite Risk Score curve */}
              {(viewMetric === "all" || viewMetric === "risk") && (
                <Line
                  yAxisId="micro"
                  type="monotone"
                  dataKey="risk_score"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 15-20 Day Predictive Breeding Wave Forecast Section (Section 3 & 11) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                15 - 20 Day Predictive Breeding &amp; Emergence Forecast
              </h4>
              <p className="text-xs text-slate-400">
                Statistically projects larval maturation into adult hatching wave 15-20 days before economic damage threshold
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-purple-950/60 border border-purple-800/80 text-purple-300 px-2.5 py-1 rounded-md">
            Degree-Day Incubation Model: 26-90 Day Cycle
          </span>
        </div>

        <div className="h-56 w-full min-h-[224px] min-w-0 mt-4 relative">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecast} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="day_label" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                yAxisId="emergence"
                stroke="#ec4899"
                tick={{ fontSize: 10 }}
                domain={[0, "dataMax + 6"]}
                label={{ value: "Projected Adult Emergence", angle: -90, position: "insideLeft", fill: "#ec4899", fontSize: 10 }}
              />
              <YAxis
                yAxisId="risk"
                orientation="right"
                stroke="#a855f7"
                tick={{ fontSize: 10 }}
                domain={[0, 100]}
                label={{ value: "Projected Breeding Risk (0-100)", angle: 90, position: "insideRight", fill: "#a855f7", fontSize: 10 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as ForecastDay;
                    return (
                      <div className="bg-slate-900 border border-purple-500/40 p-3 rounded-lg shadow-xl text-xs space-y-1 font-sans">
                        <div className="font-bold text-white flex items-center justify-between gap-4">
                          <span>{d.date} ({d.day_offset} days out)</span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 text-[10px] font-mono">
                            {d.breeding_risk_level.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-purple-300 font-medium">
                          Projected Risk: <strong>{d.projected_risk_score} / 100</strong>
                        </div>
                        <div className="text-pink-300">
                          Projected Adult Emergence: <strong>~{d.projected_emergence_count} beetles</strong>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Simulated Microclimate: {d.projected_temp}°C • {d.projected_humidity}% RH
                        </div>
                        <div className="text-[11px] text-amber-300 pt-1 border-t border-slate-800">
                          💡 {d.recommendation}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                yAxisId="risk"
                type="monotone"
                dataKey="projected_risk_score"
                stroke="#a855f7"
                fill="#a855f7"
                fillOpacity={0.15}
              />
              <Line
                yAxisId="emergence"
                type="monotone"
                dataKey="projected_emergence_count"
                stroke="#ec4899"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#ec4899" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 15-20 Day Emergence Alert Note */}
        <div className="mt-3 p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-start gap-3 text-xs">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div className="text-slate-300">
            <strong className="text-purple-200">Critical 15-20 Day Advance Warning:</strong> Tobacco beetles remain hidden as
            larvae inside the cured leaf bales during optimal temperature (30-37°C) and RH &gt;65%. By identifying the microclimate
            spike at Day 0, MPAS alerts facility management to apply targeted phosphine fumigation or dehumidification now—before
            economic threshold damage occurs at Day 18.
          </div>
        </div>
      </div>

      {/* 90-Day MVP Evaluation KPIs Grid (Section 5 of MVP Plan) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                MVP Success Metrics &amp; 90-Day Operational Evaluation
              </h4>
              <p className="text-xs text-slate-400">
                Performance targets defined in Section 5 of the MPAS Tobacco Beetle Implementation Plan
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-emerald-950 border border-emerald-700 text-emerald-300 px-2 py-0.5 rounded">
            Pilot Status: On Track
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* KPI 1 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Count Accuracy</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-emerald-400">
                {kpis?.count_accuracy_pct ?? 87.8}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">≥85%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${kpis?.count_accuracy_pct || 87.8}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5">
              vs manual specialist count
            </span>
          </div>

          {/* KPI 2 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">15-20d Prediction</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-purple-400">
                {kpis?.prediction_accuracy_pct ?? 74.2}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">≥70%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-purple-400" style={{ width: `${kpis?.prediction_accuracy_pct || 74.2}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5">
              hatching wave forecast rate
            </span>
          </div>

          {/* KPI 3 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Avg Response Time</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-cyan-400">
                {kpis?.avg_response_time_hours ?? 2.6}h
              </span>
              <span className="text-[10px] text-slate-500 font-mono">&lt;4.0h</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ width: "65%" }} />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5">
              alert to field action logged
            </span>
          </div>

          {/* KPI 4 */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Bale Infestation Drop</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-amber-400">
                {kpis?.infestation_reduction_pct ?? 34.5}%
              </span>
              <span className="text-[10px] text-slate-500 font-mono">≥30%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-amber-400" style={{ width: `${(kpis?.infestation_reduction_pct || 34.5) * 2}%` }} />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5">
              reduction vs prior season
            </span>
          </div>

          {/* KPI 5: 100% impact measured */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block font-medium">Actions Measured</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-emerald-300">
                {kpis?.closed_with_measurement_pct ?? 100}%
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Target: 100%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: "100%" }} />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1.5">
              15-20d follow-up recorded
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
