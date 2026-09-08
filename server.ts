import express from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { createServer as createViteServer } from "vite";

import { alertStore } from "./server/store";
import { aiEngine } from "./server/ai_engine";
import {
  createAccessToken,
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  checkFacilityAccess,
  TokenClaims,
} from "./server/security";
import { AlertRule, UserRole } from "./server/models";

const PORT = 3000;
const HOST = "0.0.0.0";

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
  storage: multer.memoryStorage(),
});

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true }));

  // --- API Routes (First) ---

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "mpas-api", ai_engine: "ready" });
  });

  // Auth: OAuth2 Password Token
  app.post("/api/v1/auth/token", (req, res) => {
    const username = req.body.username || req.query.username;
    const password = req.body.password || req.query.password;

    const devUsername = process.env.MPAS_DEV_USERNAME || "demo";
    const devPassword = process.env.MPAS_DEV_PASSWORD || "change-me";

    let accounts: Record<string, any> = {
      demo: {
        password: devPassword,
        role: "facility_manager",
        tenant_id: "tenant-demo",
        facilities: ["*"],
      },
      admin: {
        password: "admin-pass",
        role: "admin_executive",
        tenant_id: "tenant-admin",
        facilities: ["*"],
      },
      tech: {
        password: "tech-pass",
        role: "field_technician",
        tenant_id: "tenant-field",
        facilities: ["*"],
      },
    };

    if (process.env.MPAS_DEV_ACCOUNTS_JSON) {
      try {
        const custom = JSON.parse(process.env.MPAS_DEV_ACCOUNTS_JSON);
        accounts = { ...accounts, ...custom };
      } catch {
        // ignore malformed custom accounts
      }
    }

    let account = accounts[username];
    if (!account && username === devUsername) {
      account = {
        password: devPassword,
        role: "facility_manager",
        tenant_id: "tenant-development",
        facilities: ["*"],
      };
    }

    if (!account || account.password !== password) {
      return res.status(401).json({ detail: "Invalid credentials" });
    }

    const token = createAccessToken(
      username,
      account.role as UserRole,
      account.tenant_id || "tenant-development",
      account.facilities || ["*"]
    );

    res.json({
      access_token: token,
      token_type: "bearer",
      user: {
        username,
        role: account.role,
        tenant_id: account.tenant_id || "tenant-development",
        facilities: account.facilities || ["*"],
      },
    });
  });

  // Image Upload
  app.post("/api/v1/images", optionalAuthMiddleware, upload.single("image"), (req, res) => {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ detail: "No image file provided" });
    }

    const allowedMime = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMime.includes(file.mimetype)) {
      return res.status(415).json({ detail: "Unsupported image type" });
    }

    const imageId = crypto.randomUUID();
    const imageUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    const claims = (req as any).claims as TokenClaims | undefined;
    alertStore.audit(claims?.sub || "operator", "image.uploaded", imageId, {
      content_type: file.mimetype,
      size_bytes: file.size,
    });

    res.json({
      image_uri: imageUri,
      content_type: file.mimetype,
      size_bytes: file.size,
    });
  });

  // AI Inspect
  app.post("/api/v1/ai/inspect", optionalAuthMiddleware, (req, res) => {
    const { facility_id, trap_id, image_uri, detections, threshold } = req.body;
    if (!facility_id || !trap_id) {
      return res.status(422).json({ detail: "facility_id and trap_id are required" });
    }

    const claims = (req as any).claims as TokenClaims | undefined;
    if (claims && !checkFacilityAccess(claims, facility_id)) {
      return res.status(403).json({ detail: "Facility is outside tenant scope" });
    }

    const savedRule = alertStore.get(facility_id);
    let resolvedThreshold = threshold;
    if (resolvedThreshold === undefined && savedRule && savedRule.enabled) {
      resolvedThreshold = savedRule.threshold;
    }

    const result = aiEngine.inspect({
      facility_id,
      trap_id,
      image_uri: image_uri || "mock://trap-image",
      detections,
      threshold: resolvedThreshold,
    });

    if (result.work_order) {
      const work_order_id = crypto
        .createHash("sha256")
        .update(`${facility_id}:${trap_id}:${image_uri || "mock"}:${result.pest_count}`)
        .digest("hex")
        .slice(0, 24);

      result.work_order.work_order_id = work_order_id;

      alertStore.saveWorkOrder({
        work_order_id,
        facility_id,
        trap_id,
        pest_count: result.pest_count,
        priority: result.work_order.priority,
        status: "requested",
        reason: result.work_order.reason,
      });

      alertStore.audit(claims?.sub || "ai-engine", "work_order.created", work_order_id, {
        facility_id,
        trap_id,
        pest_count: result.pest_count,
        threshold: resolvedThreshold || 5,
        priority: result.work_order.priority,
      });
    }

    res.json(result);
  });

  // Voice Commands
  app.post("/api/v1/voice/commands", optionalAuthMiddleware, (req, res) => {
    const { user_id, role, transcript, locale, facility_id, threshold } = req.body;
    if (!transcript) {
      return res.status(422).json({ detail: "transcript is required" });
    }

    const claims = (req as any).claims as TokenClaims | undefined;
    if (claims && claims.role !== role) {
      return res.status(403).json({ detail: "Role does not match token" });
    }

    if (facility_id && claims && !checkFacilityAccess(claims, facility_id)) {
      return res.status(403).json({ detail: "Facility is outside tenant scope" });
    }

    const result = aiEngine.handleVoice({
      user_id: user_id || claims?.sub || "voice-user",
      role: role || (claims?.role as UserRole) || "facility_manager",
      transcript,
      locale,
      facility_id,
      threshold,
    });

    if (result.intent === "list_work_orders") {
      const targetFacility = facility_id || "facility-1";
      result.action = {
        type: "list_work_orders",
        facility_id: targetFacility,
        work_orders: alertStore.listWorkOrders(targetFacility),
      };
      alertStore.audit(claims?.sub || user_id || "voice-agent", "work_order.listed", targetFacility, {
        source: "voice",
        transcript,
      });
      return res.json(result);
    }

    if (result.intent === "create_alert_rule") {
      const actorRole = role || claims?.role || "facility_manager";
      if (!["admin_executive", "facility_manager"].includes(actorRole)) {
        return res.status(403).json({ detail: "Role cannot update alert rules" });
      }

      const targetFacility = facility_id || "facility-1";
      const ruleThreshold = Number(result.action?.threshold) || 5;

      const updatedRule: AlertRule = {
        facility_id: targetFacility,
        pest_type: "any",
        threshold: ruleThreshold,
        cooldown_minutes: 60,
        enabled: true,
      };

      alertStore.upsert(updatedRule);
      alertStore.audit(claims?.sub || user_id || "voice-agent", "alert_rule.created_or_updated", targetFacility, {
        threshold: ruleThreshold,
        source: "voice",
        transcript,
      });

      result.action = {
        ...result.action,
        facility_id: targetFacility,
      };
    }

    res.json(result);
  });

  // Alert Rule: Upsert
  app.put("/api/v1/facilities/:facility_id/alert-rule", optionalAuthMiddleware, (req, res) => {
    const facility_id = String(req.params.facility_id);
    const claims = (req as any).claims as TokenClaims | undefined;

    if (claims) {
      if (!["admin_executive", "facility_manager"].includes(claims.role)) {
        return res.status(403).json({ detail: "Insufficient role" });
      }
      if (!checkFacilityAccess(claims, facility_id)) {
        return res.status(403).json({ detail: "Facility is outside tenant scope" });
      }
    }

    const rule = req.body as AlertRule;
    rule.facility_id = facility_id;
    const updated = alertStore.upsert(rule);

    alertStore.audit(claims?.sub || "operator", "alert_rule.created_or_updated", facility_id, {
      threshold: updated.threshold,
      pest_type: updated.pest_type,
      cooldown_minutes: updated.cooldown_minutes,
      source: "rest",
    });

    res.json(updated);
  });

  // Alert Rule: Get
  app.get("/api/v1/facilities/:facility_id/alert-rule", optionalAuthMiddleware, (req, res) => {
    const facility_id = String(req.params.facility_id);
    const claims = (req as any).claims as TokenClaims | undefined;

    if (claims && !checkFacilityAccess(claims, facility_id)) {
      return res.status(403).json({ detail: "Facility is outside tenant scope" });
    }

    const rule = alertStore.get(facility_id) || {
      facility_id,
      pest_type: "any",
      threshold: 5,
      cooldown_minutes: 60,
      enabled: true,
    };
    res.json(rule);
  });

  // Work Orders: List for facility
  app.get("/api/v1/facilities/:facility_id/work-orders", optionalAuthMiddleware, (req, res) => {
    const facility_id = String(req.params.facility_id);
    const claims = (req as any).claims as TokenClaims | undefined;

    if (claims && !checkFacilityAccess(claims, facility_id)) {
      return res.status(403).json({ detail: "Facility is outside tenant scope" });
    }

    const list = alertStore.listWorkOrders(facility_id);
    res.json(list);
  });

  // Work Orders: Update status
  app.patch("/api/v1/work-orders/:work_order_id", optionalAuthMiddleware, (req, res) => {
    const work_order_id = String(req.params.work_order_id);
    const { status } = req.body;
    const validStatuses = ["requested", "acknowledged", "in_progress", "completed", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(422).json({ detail: "Invalid work order status" });
    }

    const updated = alertStore.updateWorkOrderStatus(work_order_id, status);
    if (!updated) {
      return res.status(404).json({ detail: "Work order not found" });
    }

    const claims = (req as any).claims as TokenClaims | undefined;
    alertStore.audit(claims?.sub || "field-technician", "work_order.status_updated", work_order_id, {
      status,
      facility_id: updated.facility_id,
    });

    res.json(updated);
  });

  // Audit Events: List
  app.get("/api/v1/audit-events", optionalAuthMiddleware, (req, res) => {
    const claims = (req as any).claims as TokenClaims | undefined;
    if (claims && claims.role !== "admin_executive") {
      return res.status(403).json({ detail: "Insufficient role" });
    }

    const events = alertStore.listAuditEvents(50);
    res.json(events);
  });

  // Facilities Overview: List active facilities
  app.get("/api/v1/facilities", (req, res) => {
    const facilities = [
      {
        id: "facility-1",
        name: "Distribution Center Alpha",
        zone: "Cold Storage & Bay 3",
        traps: ["trap-1", "trap-2"],
        rule: alertStore.get("facility-1"),
        workOrdersCount: alertStore.listWorkOrders("facility-1").length,
      },
      {
        id: "facility-demo",
        name: "Food Processing Plant B",
        zone: "Packaging & Assembly Line",
        traps: ["trap-2", "trap-3"],
        rule: alertStore.get("facility-demo"),
        workOrdersCount: alertStore.listWorkOrders("facility-demo").length,
      },
      {
        id: "facility-voice",
        name: "Grain Silo Complex 4",
        zone: "Grain Elevator & Milling",
        traps: ["trap-9"],
        rule: alertStore.get("facility-voice"),
        workOrdersCount: alertStore.listWorkOrders("facility-voice").length,
      },
    ];
    res.json(facilities);
  });

  // --- Vite Middleware for Development / Static for Production ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[M-PAS Platform] Server running on http://${HOST}:${PORT}`);
  });
}

startServer();
