export interface PhysicalTrapMetadata {
  id: string;
  qrCodeValue: string;
  name: string;
  zone: string;
  pillarLocation: string;
  lureType: string;
  lureBatch: string;
  lureInstalledDate: string;
  lureAgeDays: number;
  lureMaxDays: number;
  pairedSensorId: string;
  temperature: number;
  humidity: number;
  lastCatchCount: number;
  status: "active" | "maintenance_due" | "lure_expired";
  statusNote: string;
}

export const PHYSICAL_TRAPS_REGISTRY: Record<string, PhysicalTrapMetadata> = {
  "trap-tb-01": {
    id: "trap-tb-01",
    qrCodeValue: "PMAS-TRAP:trap-tb-01",
    name: "Trap TB-01",
    zone: "Cold Storage & Bay 3",
    pillarLocation: "Pillar C-12 (Height: 2.2m near flue-cured tobacco stacks)",
    lureType: "Commercial Serricornin Matrix (High-potency)",
    lureBatch: "SERR-2026-B402",
    lureInstalledDate: "2026-08-20",
    lureAgeDays: 19,
    lureMaxDays: 45,
    pairedSensorId: "Sensirion SHT31-SN-8924",
    temperature: 28.4,
    humidity: 62.1,
    lastCatchCount: 8,
    status: "active",
    statusNote: "High activity detected in last dusk exposure",
  },
  "trap-tb-02": {
    id: "trap-tb-02",
    qrCodeValue: "PMAS-TRAP:trap-tb-02",
    name: "Trap TB-02",
    zone: "Burley Aging Cellar & Bay 7",
    pillarLocation: "Beam B-04 (Height: 1.8m near fermentation stacks)",
    lureType: "Commercial Serricornin Matrix Standard",
    lureBatch: "SERR-2026-B403",
    lureInstalledDate: "2026-08-15",
    lureAgeDays: 24,
    lureMaxDays: 45,
    pairedSensorId: "Sensirion SHT31-SN-8931",
    temperature: 27.8,
    humidity: 58.4,
    lastCatchCount: 3,
    status: "active",
    statusNote: "Within normal seasonal thresholds",
  },
  "trap-tb-03": {
    id: "trap-tb-03",
    qrCodeValue: "PMAS-TRAP:trap-tb-03",
    name: "Trap TB-03",
    zone: "Intake Staging & Dock A",
    pillarLocation: "Intake Bay 1 (Height: 2.0m quarantine corridor)",
    lureType: "Serricornin Multi-Pheromone Lure",
    lureBatch: "SERR-2026-B389",
    lureInstalledDate: "2026-07-28",
    lureAgeDays: 42,
    lureMaxDays: 45,
    pairedSensorId: "Sensirion SHT31-SN-8940",
    temperature: 29.5,
    humidity: 67.2,
    lastCatchCount: 6,
    status: "maintenance_due",
    statusNote: "Lure approaching 45-day expiration; replacement recommended",
  },
  "trap-tb-04": {
    id: "trap-tb-04",
    qrCodeValue: "PMAS-TRAP:trap-tb-04",
    name: "Trap TB-04",
    zone: "Packaging & Finished Goods Bay 5",
    pillarLocation: "Post E-02 (Height: 2.1m clean corridor)",
    lureType: "Commercial Serricornin Matrix Standard",
    lureBatch: "SERR-2026-B412",
    lureInstalledDate: "2026-08-31",
    lureAgeDays: 8,
    lureMaxDays: 45,
    pairedSensorId: "Sensirion SHT31-SN-8955",
    temperature: 26.2,
    humidity: 52.0,
    lastCatchCount: 1,
    status: "active",
    statusNote: "Clean baseline, optimal environmental conditions",
  },
};

/**
 * Parses any QR code payload into a recognized physical trap ID
 */
export function parseTrapQRCode(decodedText: string): PhysicalTrapMetadata | null {
  if (!decodedText || typeof decodedText !== "string") return null;

  const clean = decodedText.trim();

  // 1. Direct match with QR code value (e.g. "PMAS-TRAP:trap-tb-01")
  for (const trap of Object.values(PHYSICAL_TRAPS_REGISTRY)) {
    if (trap.qrCodeValue.toLowerCase() === clean.toLowerCase()) {
      return trap;
    }
  }

  // 2. Direct ID match (e.g. "trap-tb-01")
  for (const trap of Object.values(PHYSICAL_TRAPS_REGISTRY)) {
    if (trap.id.toLowerCase() === clean.toLowerCase()) {
      return trap;
    }
  }

  // 3. Substring match (e.g. "trap-tb-01", "tb-01", "trap-1")
  for (const [key, trap] of Object.entries(PHYSICAL_TRAPS_REGISTRY)) {
    if (clean.toLowerCase().includes(key.toLowerCase())) {
      return trap;
    }
  }

  // 4. JSON payload (e.g. {"trap_id": "trap-tb-01"})
  try {
    const json = JSON.parse(clean);
    const candidateId = json.trap_id || json.id || json.trap;
    if (candidateId && PHYSICAL_TRAPS_REGISTRY[candidateId]) {
      return PHYSICAL_TRAPS_REGISTRY[candidateId];
    }
  } catch {
    // Not a JSON payload
  }

  return null;
}

export interface ScannedTrapHistoryItem {
  id: string;
  trapId: string;
  trap: PhysicalTrapMetadata;
  scannedAt: string; // ISO string
  timestampDisplay: string;
  method: "camera" | "photo_upload" | "preset_simulation" | "manual";
}

const SCAN_HISTORY_STORAGE_KEY = "pmas_session_trap_scan_history";

export function getLocalScanHistory(): ScannedTrapHistoryItem[] {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const stored = sessionStorage.getItem(SCAN_HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Could not read scan history from sessionStorage:", err);
  }

  // Pre-populate with initial verified check-in for the active session
  const defaultTrap = PHYSICAL_TRAPS_REGISTRY["trap-tb-01"];
  const initialHistory: ScannedTrapHistoryItem[] = [
    {
      id: "scan-init-01",
      trapId: defaultTrap.id,
      trap: defaultTrap,
      scannedAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      timestampDisplay: "14m ago",
      method: "camera",
    },
  ];

  return initialHistory;
}

export function saveLocalScanHistory(items: ScannedTrapHistoryItem[]): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(items));
    }
  } catch (err) {
    console.warn("Could not write scan history to sessionStorage:", err);
  }
}

export function clearLocalScanHistory(): void {
  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.removeItem(SCAN_HISTORY_STORAGE_KEY);
    }
  } catch (err) {
    console.warn("Could not clear scan history from sessionStorage:", err);
  }
}
