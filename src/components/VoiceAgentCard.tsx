import React, { useState } from "react";
import { Mic, MicOff, Volume2, Send, Globe, Sparkles, CheckCircle2 } from "lucide-react";
import { UserRole, UserSession } from "../types";

interface VoiceAgentCardProps {
  session: UserSession;
  facilityId: string;
  onVoiceCommandSuccess: () => void;
}

const SAMPLE_COMMANDS = [
  {
    lang: "English",
    locale: "en-US",
    text: "Create alert rule with threshold 4",
    threshold: 4,
    description: "Sets facility threshold to 4 pests",
  },
  {
    lang: "العربية (Arabic)",
    locale: "ar-SA",
    text: "أنشئ تنبيه عند تجاوز الحد 5 للمنشأة",
    threshold: 5,
    description: "تعديل حد التنبيه باللغة العربية",
  },
  {
    lang: "Français",
    locale: "fr-FR",
    text: "Définir le seuil d'alerte à 6 ravageurs",
    threshold: 6,
    description: "Configuration du seuil d'alerte",
  },
  {
    lang: "Español",
    locale: "es-ES",
    text: "Listar órdenes de trabajo para la instalación",
    threshold: undefined,
    description: "Consulta órdenes activas de control",
  },
];

export const VoiceAgentCard: React.FC<VoiceAgentCardProps> = ({
  session,
  facilityId,
  onVoiceCommandSuccess,
}) => {
  const [transcript, setTranscript] = useState("");
  const [locale, setLocale] = useState("en-US");
  const [thresholdInput, setThresholdInput] = useState<string>("5");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastResponse, setLastResponse] = useState<{
    intent: string;
    response: string;
    action?: any;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Web Speech API trigger
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech recognition not supported in this browser. Please use text input or preset chips.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = locale;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setTranscript(speechResult);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setErrorMessage(`Audio error: ${event.error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      setErrorMessage(e.message || "Could not start audio listener");
    }
  };

  const handleSendCommand = async (
    textToSubmit?: string,
    overrideLocale?: string,
    overrideThreshold?: number
  ) => {
    const text = textToSubmit || transcript;
    if (!text.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const targetThreshold =
      overrideThreshold !== undefined
        ? overrideThreshold
        : thresholdInput.trim()
        ? parseInt(thresholdInput, 10)
        : 5;

    try {
      const res = await fetch("/api/v1/voice/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          user_id: session.username,
          role: session.role,
          transcript: text,
          locale: overrideLocale || locale,
          facility_id: facilityId,
          threshold: targetThreshold,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Voice command rejected");
      }

      setLastResponse(data);
      onVoiceCommandSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to execute voice command");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Multilingual Voice Agent
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 font-mono">
                EN • AR • FR • ES
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Autonomous role-authorized voice dispatch for alert policies and work orders
            </p>
          </div>
        </div>

        {/* Locale Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-purple-400" />
          <select
            id="voice-locale-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            <option value="en-US" className="bg-slate-900">English (en-US)</option>
            <option value="ar-SA" className="bg-slate-900">العربية (ar-SA)</option>
            <option value="fr-FR" className="bg-slate-900">Français (fr-FR)</option>
            <option value="es-ES" className="bg-slate-900">Español (es-ES)</option>
          </select>
        </div>
      </div>

      {/* Input row */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            id="toggle-mic-btn"
            type="button"
            onClick={toggleSpeechRecognition}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition ${
              isListening
                ? "bg-rose-600 text-white border-rose-500 animate-pulse"
                : "bg-slate-900 hover:bg-slate-700 text-purple-400 border-slate-700"
            }`}
            title={isListening ? "Stop listening" : "Click to speak"}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            id="voice-transcript-input"
            type="text"
            placeholder={
              locale.startsWith("ar")
                ? "اكتب أو قل أمراً صوتياً (مثل: أنشئ تنبيه عند تجاوز الحد 4)..."
                : "Speak or type voice command (e.g. 'create alert rule with threshold 4')..."
            }
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendCommand();
            }}
            dir={locale.startsWith("ar") ? "rtl" : "ltr"}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />

          <button
            id="send-voice-btn"
            type="button"
            onClick={() => handleSendCommand()}
            disabled={isProcessing || !transcript.trim()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isProcessing ? "Processing..." : "Dispatch"}
          </button>
        </div>

        {isListening && (
          <div className="flex items-center gap-2 text-xs text-rose-400 animate-pulse px-1">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            Listening to microphone in {locale}... Speak clearly into your device.
          </div>
        )}

        {errorMessage && (
          <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-lg p-2.5">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Preset Quick Chips */}
      <div>
        <span className="text-xs text-slate-400 font-medium block mb-1.5">
          One-Click Sample Commands:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_COMMANDS.map((cmd, idx) => (
            <button
              key={idx}
              id={`sample-cmd-${idx}`}
              onClick={() => {
                setTranscript(cmd.text);
                setLocale(cmd.locale);
                handleSendCommand(cmd.text, cmd.locale, cmd.threshold);
              }}
              className="text-left p-2 rounded-lg bg-slate-900/70 hover:bg-slate-700/60 border border-slate-700/60 transition group text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-purple-400 group-hover:text-purple-300">
                  {cmd.lang}
                </span>
                {cmd.threshold && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    Threshold: {cmd.threshold}
                  </span>
                )}
              </div>
              <div className="font-medium text-slate-200 mt-1" dir={cmd.locale.startsWith("ar") ? "rtl" : "ltr"}>
                "{cmd.text}"
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Response Box */}
      {lastResponse && (
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-mono text-purple-400 uppercase font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Intent: {lastResponse.intent}
            </span>
            <span className="text-[10px] text-slate-400">Audio Synthesis / Voice Seam</span>
          </div>

          <div className="text-sm font-medium text-white flex items-start gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{lastResponse.response}</span>
          </div>

          {lastResponse.action && (
            <div className="mt-1 pt-1.5 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
              Action executed: {JSON.stringify(lastResponse.action)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
