import React from "react";
import { ShieldCheck, Cpu, Building2, UserCircle, RefreshCw } from "lucide-react";
import { UserRole, UserSession, FacilityInfo } from "../types";

interface HeaderProps {
  session: UserSession;
  onRoleChange: (role: UserRole) => void;
  facilities: FacilityInfo[];
  selectedFacilityId: string;
  onFacilityChange: (id: string) => void;
  apiHealthy: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onRoleChange,
  facilities,
  selectedFacilityId,
  onFacilityChange,
  apiHealthy,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & System Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold tracking-wider">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight">M-PAS</span>
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  v0.1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Industrial Pest-Management & AI Inspection Platform
              </p>
            </div>
          </div>

          {/* Engine Status Pill */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                apiHealthy ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span className="text-slate-300 font-medium">AI Engine:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" /> YOLOv9 + SAM2 Ready
            </span>
          </div>

          {/* Controls: Facility Selector & Role Switcher */}
          <div className="flex items-center space-x-3">
            {/* Facility Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="facility-select"
                aria-label="Select facility"
                value={selectedFacilityId}
                onChange={(e) => onFacilityChange(e.target.value)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id} className="bg-slate-900 text-slate-200">
                    {fac.name} ({fac.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
              <UserCircle className="w-3.5 h-3.5 text-amber-400" />
              <select
                id="role-select"
                aria-label="Select user role"
                value={session.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="facility_manager" className="bg-slate-900 text-slate-200">
                  Facility Manager (demo)
                </option>
                <option value="field_technician" className="bg-slate-900 text-slate-200">
                  Field Tech (tech)
                </option>
                <option value="admin_executive" className="bg-slate-900 text-slate-200">
                  Admin Executive (admin)
                </option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              id="refresh-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Data"
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
