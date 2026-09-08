import React, { useState } from "react";
import { Terminal, Play, CheckCircle2, AlertTriangle, Copy, Check } from "lucide-react";
import { UserSession } from "../types";

interface ApiDiagnosticsProps {
  session: UserSession;
}

export const ApiDiagnostics: React.FC<ApiDiagnosticsProps> = ({ session }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState("health");
  const [requestMethod, setRequestMethod] = useState("GET");
  const [requestPath, setRequestPath] = useState("/health");
  const [requestBody, setRequestBody] = useState("");
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const PRESETS = [
    {
      id: "health",
      name: "GET /health (System Readiness)",
      method: "GET",
      path: "/health",
      body: "",
    },
    {
      id: "token",
      name: "POST /api/v1/auth/token (OAuth2 Auth)",
      method: "POST",
      path: "/api/v1/auth/token",
      body: JSON.stringify({ username: "demo", password: "change-me" }, null, 2),
    },
    {
      id: "inspect",
      name: "POST /api/v1/ai/inspect (AI Pipeline)",
      method: "POST",
      path: "/api/v1/ai/inspect",
      body: JSON.stringify(
        {
          facility_id: "facility-1",
          trap_id: "trap-1",
          threshold: 3,
          detections: [
            { label: "cockroach", confidence: 0.95, area_ratio: 0.02 },
            { label: "cockroach", confidence: 0.91, area_ratio: 0.02 },
            { label: "fly", confidence: 0.88, area_ratio: 0.01 },
            { label: "beetle", confidence: 0.84, area_ratio: 0.02 },
          ],
        },
        null,
        2
      ),
    },
    {
      id: "voice",
      name: "POST /api/v1/voice/commands (Arabic NLP)",
      method: "POST",
      path: "/api/v1/voice/commands",
      body: JSON.stringify(
        {
          user_id: "u-1",
          role: "facility_manager",
          transcript: "أنشئ تنبيه عند تجاوز الحد",
          facility_id: "facility-voice",
          threshold: 7,
          locale: "ar-SA",
        },
        null,
        2
      ),
    },
    {
      id: "alert_rule",
      name: "GET /api/v1/facilities/facility-1/alert-rule",
      method: "GET",
      path: "/api/v1/facilities/facility-1/alert-rule",
      body: "",
    },
    {
      id: "work_orders",
      name: "GET /api/v1/facilities/facility-1/work-orders",
      method: "GET",
      path: "/api/v1/facilities/facility-1/work-orders",
      body: "",
    },
    {
      id: "audit_events",
      name: "GET /api/v1/audit-events (Admin Only)",
      method: "GET",
      path: "/api/v1/audit-events",
      body: "",
    },
  ];

  const handleSelectPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setSelectedEndpoint(presetId);
    setRequestMethod(p.method);
    setRequestPath(p.path);
    setRequestBody(p.body);
    setResponseStatus(null);
    setResponseBody("");
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseBody("");

    try {
      const options: RequestInit = {
        method: requestMethod,
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      };

      if (requestMethod !== "GET" && requestBody.trim()) {
        (options.headers as any)["Content-Type"] = "application/json";
        options.body = requestBody;
      }

      const res = await fetch(requestPath, options);
      setResponseStatus(res.status);

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const json = await res.json();
        setResponseBody(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setResponseBody(text);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(responseBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          API Verification & Scaffolding Inspector
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Execute live HTTP requests directly against the M-PAS platform endpoints to verify OAuth2 claims, YOLOv9/SAM2 inspection payloads, and ERP data contracts.
        </p>
      </div>

      {/* Preset Selector */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Select Standard Endpoint Contract:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              id={`preset-${p.id}`}
              onClick={() => handleSelectPreset(p.id)}
              className={`text-left p-2.5 rounded-lg border text-xs font-medium transition ${
                selectedEndpoint === p.id
                  ? "bg-slate-700 border-emerald-500/60 text-emerald-300"
                  : "bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Request Form */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <span className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono font-bold text-emerald-400 text-sm">
            {requestMethod}
          </span>
          <input
            id="api-path-input"
            type="text"
            value={requestPath}
            onChange={(e) => setRequestPath(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          />
          <button
            id="api-execute-btn"
            onClick={handleExecute}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition disabled:opacity-50 shrink-0"
          >
            <Play className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Executing..." : "Send Request"}
          </button>
        </div>

        {requestMethod !== "GET" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">Request JSON Body</label>
            <textarea
              id="api-body-textarea"
              rows={6}
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}

        {/* Response Box */}
        {responseStatus !== null && (
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Response Status:</span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                    responseStatus >= 200 && responseStatus < 300
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-rose-950 text-rose-300 border border-rose-800"
                  }`}
                >
                  HTTP {responseStatus}
                </span>
              </div>
              {responseBody && (
                <button
                  onClick={copyResponse}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy Response"}
                </button>
              )}
            </div>

            <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono text-emerald-300/90 overflow-x-auto max-h-96">
              {responseBody}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
