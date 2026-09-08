export type UserRole = "admin_executive" | "field_technician" | "facility_manager";

export interface UserSession {
  username: string;
  role: UserRole;
  tenant_id: string;
  token: string;
}

export type AlertLevel = "normal" | "watch" | "warning" | "critical";

export interface Detection {
  label: string; // "lasioderma_serricorne" (tobacco beetle) or "stegobium_paniceum" (drugstore beetle)
  confidence: number;
  area_ratio: number;
  source?: string;
  bbox?: [number, number, number, number]; // [x_pct, y_pct, width_pct, height_pct]
  antennae_type?: "serrate" | "clubbed"; // saw-toothed vs 3-segmented club
  elytra_texture?: "smooth_pubescent" | "striate_punctate";
}

export interface AlertRule {
  facility_id: string;
  pest_type: string;
  threshold: number;
  cooldown_minutes: number;
  enabled: boolean;
  baseline_count?: number;
}

export interface WorkOrder {
  work_order_id: string;
  facility_id: string;
  trap_id: string;
  pest_count: number;
  priority: "normal" | "high";
  status: "requested" | "acknowledged" | "in_progress" | "completed" | "cancelled";
  created_at?: string;
  updated_at?: string;
  reason?: string;
  action_type?: string;
  alert_level?: AlertLevel;
}

export interface InspectionResult {
  facility_id: string;
  trap_id: string;
  detections: Detection[];
  pest_count: number;
  threshold_exceeded: boolean;
  tobacco_beetle_count: number;
  drugstore_beetle_count: number;
  hidden_larval_estimate: number;
  risk_score: number;
  alert_level: AlertLevel;
  work_order: {
    type: string;
    priority: "normal" | "high";
    facility_id: string;
    trap_id: string;
    reason: string;
    work_order_id?: string;
    recommended_action?: string;
  } | null;
  model_version: string;
}

export interface AuditEvent {
  event_id: number;
  actor: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  created_at: string;
}

export interface FacilityInfo {
  id: string;
  name: string;
  zone: string;
  traps: string[];
  rule: AlertRule | null;
  workOrdersCount: number;
  baseline_count?: number;
  current_temperature?: number;
  current_humidity?: number;
  sunset_time?: string; // dusk photo schedule
  serricornin_lure_age_days?: number;
}

export interface DailyTelemetry {
  date: string;
  day_label: string;
  count: number;
  moving_avg_3d: number;
  baseline: number;
  temperature: number; // °C
  humidity: number; // RH %
  count_factor: number;
  humidity_factor: number;
  temp_factor: number;
  risk_score: number;
  alert_level: AlertLevel;
  override_triggered: boolean;
  dusk_photo_timestamp: string;
  estimated_hidden_larvae: number;
}

export interface ForecastDay {
  day_offset: number; // 1 to 20
  date: string;
  day_label?: string;
  projected_risk_score: number;
  projected_hatching_index: number;
  projected_emergence_count?: number;
  projected_temp: number;
  projected_humidity: number;
  breeding_risk_level: AlertLevel;
  recommendation: string;
}

export interface DocumentedAction {
  action_id: string;
  facility_id: string;
  trap_id: string;
  alert_level: AlertLevel;
  risk_score: number;
  trigger_reason: string;
  action_type: "cooling_ventilation" | "dehumidification" | "batch_isolation" | "phosphine_fumigation" | "sample_dissection";
  action_title: string;
  action_details: string;
  logged_at: string;
  logged_by: string;
  follow_up_date: string; // 15-20 days later
  status: "action_logged" | "awaiting_15d_measurement" | "impact_measured_closed";
  pre_action_count: number;
  post_action_count_15d?: number;
  reduction_pct?: number;
  impact_measured_at?: string;
  impact_measurement_notes?: string;
}

export interface MvpKpiSummary {
  count_accuracy_pct: number; // Target >= 85%
  prediction_accuracy_pct: number; // Target >= 70%
  avg_response_time_hours: number; // Target < 4h
  infestation_reduction_pct: number; // Target >= 30%
  closed_with_measurement_pct: number; // Target 100%
  total_alerts: number;
  actions_logged: number;
  actions_measured: number;
}
