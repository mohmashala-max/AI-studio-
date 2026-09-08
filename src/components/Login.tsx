import React, { useState } from "react";
import {
  Shield,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  KeyRound,
  CheckCircle,
  Building2,
  Cpu,
} from "lucide-react";
import { UserSession } from "../types";
import pmasLogo from "../assets/images/pmas_logo_1788905609728.jpg";

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
  apiHealthy: boolean;
}

interface PresetAccount {
  label: string;
  role: string;
  username: string;
  password: string;
  badgeColor: string;
  description: string;
}

const PRESET_ACCOUNTS: PresetAccount[] = [
  {
    label: "Facility Manager",
    role: "Operations & Policies",
    username: "demo",
    password: "change-me",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description: "Manage facilities, configure alert thresholds, and inspect pest traps.",
  },
  {
    label: "Admin Executive",
    role: "Global Governance",
    username: "admin",
    password: "admin-pass",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    description: "Multi-tenant tenant management, enterprise audits, and system configuration.",
  },
  {
    label: "Field Technician",
    role: "Remediation & Field Ops",
    username: "tech",
    password: "tech-pass",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description: "Receive autonomous work orders, execute trap remediation, and resolve issues.",
  },
];

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, apiHealthy }) => {
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("change-me");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setErrorMessage(errorData.detail || "Authentication failed. Check your username and password.");
        setIsLoading(false);
        return;
      }

      const data = await res.json();
      const newSession: UserSession = {
        username: data.user.username,
        role: data.user.role,
        tenant_id: data.user.tenant_id,
        token: data.access_token,
      };

      onLoginSuccess(newSession);
    } catch (err: any) {
      console.error("Login request failed:", err);
      setErrorMessage("Network error connecting to PMAS API server. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: PresetAccount) => {
    setUsername(preset.username);
    setPassword(preset.password);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-slate-900">
      {/* Subtle Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-emerald-500/10 via-transparent to-transparent pointer-events-none blur-3xl -z-10" />
      <div className="absolute -bottom-20 right-10 w-96 h-96 bg-radial from-cyan-500/5 via-transparent to-transparent pointer-events-none blur-3xl -z-10" />

      {/* Top Brand Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-900 flex items-center justify-center shadow-sm">
            <img
              src={pmasLogo}
              alt="PMAS Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight text-sm sm:text-base">
              PMAS Platform
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              v0.1.0 • Enterprise
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              apiHealthy ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
            }`}
          />
          <span className="text-slate-400 font-mono hidden sm:inline">
            {apiHealthy ? "Backend Engine Online" : "Backend Offline"}
          </span>
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          {/* Logo & Headline */}
          <div className="text-center space-y-3">
            <div className="inline-flex relative p-1 rounded-2xl bg-gradient-to-b from-emerald-500/30 via-slate-800 to-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10">
              <img
                src={pmasLogo}
                alt="PMAS Logo"
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-xl object-cover shadow-inner"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100">
                Sign in to PMAS
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                Pest Management Automation System & Autonomous Vision Control Portal
              </p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl backdrop-blur-sm space-y-5">
            {errorMessage && (
              <div
                id="login-error-alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Authentication Error</p>
                  <p className="text-rose-300/90 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username-input"
                  className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username-input"
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password-input"
                    className="block text-xs font-semibold text-slate-300 uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password-input"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition transform active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Credentials Panel */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  Quick-Fill Demo Credentials
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Click to autofill</span>
              </div>

              <div className="space-y-2">
                {PRESET_ACCOUNTS.map((preset) => {
                  const isSelected =
                    username === preset.username && password === preset.password;
                  return (
                    <button
                      key={preset.username}
                      id={`preset-btn-${preset.username}`}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
                        isSelected
                          ? "bg-slate-800/90 border-emerald-500/60 shadow-sm shadow-emerald-500/10"
                          : "bg-slate-950/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">
                            {preset.label}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${preset.badgeColor}`}
                          >
                            {preset.username}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {preset.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0 ml-2 font-mono text-[11px]">
                        {isSelected ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Selected
                          </span>
                        ) : (
                          <span className="text-slate-500 group-hover:text-slate-300">
                            pw: {preset.password}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* System Specs Footnote */}
          <div className="flex items-center justify-center gap-4 text-slate-500 text-xs font-mono">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-slate-400" /> Multi-Tenant Scoped
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-slate-400" /> YOLOv9/SAM2 AI
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> ISO-22000 Ready
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-3 text-center text-xs text-slate-500 font-mono">
        PMAS / M-PAS Industrial Pest-Management Platform • Node/Express & React Runtime
      </footer>
    </div>
  );
};
