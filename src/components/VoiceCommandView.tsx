import React, { useState } from "react";
import { Mic, Send, MessageSquare, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { UserSession } from "../types";

interface VoiceCommandViewProps {
  session: UserSession;
  facilityId: string;
  onActionComplete: () => void;
}

export const VoiceCommandView: React.FC<VoiceCommandViewProps> = ({
  session,
  facilityId,
  onActionComplete,
}) => {
  const [transcript, setTranscript] = useState("");
  const [locale, setLocale] = useState("ar-SA");
  const [threshold, setThreshold] = useState<number | "">("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const QUICK_PROMPTS = [
    {
      label: "أنشئ تنبيه عند تجاوز الحد (Arabic)",
      text: "أنشئ تنبيه عند تجاوز الحد",
      locale: "ar-SA",
      threshold: 6,
    },
    {
      label: "عرض أوامر العمل المفتوحة (Arabic)",
      text: "أوامر العمل للمنشأة",
      locale: "ar-SA",
      threshold: undefined,
    },
    {
      label: "Create Alert Rule (Threshold 8)",
      text: "create alert rule with threshold",
      locale: "en-US",
      threshold: 8,
    },
    {
      label: "List Open Work Orders (English)",
      text: "list work orders",
      locale: "en-US",
      threshold: undefined,
    },
  ];

  const handleSubmit = async (textToSubmit?: string, promptThreshold?: number) => {
    const text = textToSubmit || transcript;
    if (!text.trim()) return;

    setIsProcessing(true);
    setErrorMsg(null);

    const payload: any = {
      user_id: session.username,
      role: session.role,
      transcript: text,
      locale,
      facility_id: facilityId,
    };

    const finalThreshold = promptThreshold !== undefined ? promptThreshold : threshold;
    if (finalThreshold) {
      payload.threshold = Number(finalThreshold);
    }

    try {
      const res = await fetch("/api/v1/voice/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Voice command execution failed");
      }

      const data = await res.json();
      setLastResult(data);
      onActionComplete();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-400" />
          Field Voice Agent (Multilingual NLP Boundary)
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Hands-free field operations interface for technicians & managers in noisy industrial environments. Supports Arabic (Fusha/Gulf), English, French, and Spanish speech command semantics.
        </p>
      </div>

      {/* Quick Prompts */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Preset Field Commands:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              id={`quick-prompt-${idx}`}
              onClick={() => {
                setTranscript(prompt.text);
                setLocale(prompt.locale);
                if (prompt.threshold) setThreshold(prompt.threshold);
                handleSubmit(prompt.text, prompt.threshold);
              }}
              className="text-left p-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-purple-500/50 transition group"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-200 group-hover:text-purple-300 transition">
                  {prompt.label}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition" />
              </div>
              <p className="text-xs text-slate-400 mt-1 italic font-mono truncate">
                "{prompt.text}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Command Input Box */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              id="voice-command-input"
              type="text"
              placeholder="Enter voice command transcript (e.g. أنشئ تنبيه عند تجاوز الحد or list work orders)..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 pr-10"
            />
            <Mic className="w-4 h-4 text-purple-400 absolute right-3.5 top-3.5 opacity-60" />
          </div>

          <div className="flex items-center gap-2">
            <select
              id="locale-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              <option value="ar-SA">Arabic (ar-SA)</option>
              <option value="en-US">English (en-US)</option>
              <option value="fr-FR">French (fr-FR)</option>
              <option value="es-ES">Spanish (es-ES)</option>
            </select>

            <button
              id="send-voice-btn"
              onClick={() => handleSubmit()}
              disabled={isProcessing || !transcript.trim()}
              className="flex items-center gap-1.5 px-5 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm transition disabled:opacity-50 shadow-lg shadow-purple-950/40 shrink-0"
            >
              <Send className={`w-4 h-4 ${isProcessing ? "animate-spin" : ""}`} />
              Execute
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Live Result / Agent Response */}
        {lastResult && (
          <div className="mt-4 bg-slate-900/90 border border-purple-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4" /> Agent Response
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                Intent: {lastResult.intent}
              </span>
            </div>

            <p className="text-sm font-medium text-slate-100 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              {lastResult.response}
            </p>

            {lastResult.action && (
              <div className="text-xs font-mono bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 overflow-x-auto">
                <span className="text-slate-500 font-semibold block mb-1">
                  Triggered System Action:
                </span>
                <pre>{JSON.stringify(lastResult.action, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
