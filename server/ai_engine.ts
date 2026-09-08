import { Detection, InspectionRequest, InspectionResult, VoiceCommand, VoiceCommandResult } from "./models";

export class MPASInternalAIEngine {
  private readonly defaultModelVersion = "yolov9-v1+sam2-v1";

  inspect(request: InspectionRequest): InspectionResult {
    let detections = request.detections || [];

    // If detections were not provided, simulate model inference based on trap context
    if (detections.length === 0) {
      detections = this.synthesizeDetections(request.trap_id, request.image_uri);
    }

    const pest_count = detections.filter((item) => item.confidence >= 0.5).length;
    const threshold = request.threshold || 5;
    const threshold_exceeded = pest_count >= threshold;

    let work_order: InspectionResult["work_order"] = null;
    if (threshold_exceeded) {
      work_order = {
        type: "pest-treatment",
        priority: pest_count >= threshold * 2 ? "high" : "normal",
        facility_id: request.facility_id,
        trap_id: request.trap_id,
        reason: `pest count ${pest_count} reached threshold ${threshold}`,
      };
    }

    return {
      facility_id: request.facility_id,
      trap_id: request.trap_id,
      detections,
      pest_count,
      threshold_exceeded,
      work_order,
      model_version: this.defaultModelVersion,
    };
  }

  handleVoice(command: VoiceCommand): VoiceCommandResult {
    const text = command.transcript.toLowerCase();

    // Multilingual threshold keywords: English, Arabic, French, Spanish
    const thresholdTokens = ["threshold", "تجاوز", "حد", "alerte", "umbral", "عتبة", "alert"];
    const workOrderTokens = ["work order", "أمر عمل", "اوامر", "ordre", "orden", "orders", "تذاكر"];

    if (thresholdTokens.some((token) => text.includes(token))) {
      const threshold = command.threshold || 5;
      const isArabic = command.locale?.startsWith("ar") || /[\u0600-\u06FF]/.test(command.transcript);
      return {
        intent: "create_alert_rule",
        response: isArabic
          ? `تم إعداد تنبيه عند تجاوز عتبة الآفات (${threshold}) لهذه المنشأة بنجاح.`
          : `Alert rule configured: threshold set to ${threshold} pests for facility.`,
        action: {
          type: "alert_rule",
          threshold,
        },
      };
    }

    if (workOrderTokens.some((token) => text.includes(token))) {
      const isArabic = command.locale?.startsWith("ar") || /[\u0600-\u06FF]/.test(command.transcript);
      return {
        intent: "list_work_orders",
        response: isArabic
          ? "جاري تجهيز أوامر العمل المفتوحة للمنشأة."
          : "Fetching open work orders for facility.",
        action: {
          type: "list_work_orders",
        },
      };
    }

    const isArabic = command.locale?.startsWith("ar") || /[\u0600-\u06FF]/.test(command.transcript);
    return {
      intent: "unknown",
      response: isArabic
        ? "لم أفهم الأمر. يمكنك قول: 'أنشئ تنبيه عند تجاوز الحد 5' أو 'أوامر العمل'."
        : "Unrecognized command. Try 'create alert rule with threshold 5' or 'list work orders'.",
    };
  }

  private synthesizeDetections(trapId: string, imageUri: string): Detection[] {
    // Generate realistic detection boxes for demonstration
    const candidates: Detection[] = [
      { label: "cockroach", confidence: 0.94, area_ratio: 0.025, source: "yolov9-v1", bbox: [25, 30, 18, 14] },
      { label: "cockroach", confidence: 0.89, area_ratio: 0.018, source: "yolov9-v1", bbox: [55, 45, 15, 12] },
      { label: "fly", confidence: 0.78, area_ratio: 0.012, source: "yolov9-v1", bbox: [38, 70, 12, 10] },
      { label: "beetle", confidence: 0.82, area_ratio: 0.021, source: "yolov9-v1", bbox: [72, 22, 16, 15] },
    ];
    // Vary based on trap
    if (trapId.includes("1") || trapId.includes("9")) {
      return candidates;
    } else if (trapId.includes("2")) {
      return [candidates[0], candidates[2]];
    } else {
      return [candidates[0]];
    }
  }
}

export const aiEngine = new MPASInternalAIEngine();
