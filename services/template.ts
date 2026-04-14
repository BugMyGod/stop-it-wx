import {
  FALLBACK_TEMPLATES,
  HIGH_FREQUENCY_TEMPLATE_TITLES,
} from "../constants/fallback-templates";
import { ScenarioTemplate } from "../types";
import { selectRows } from "./supabase";

function parseRecommendedTones(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeTemplate(raw: Record<string, unknown>): ScenarioTemplate {
  return {
    id: String(raw.id || ""),
    template_code: String(raw.template_code || ""),
    category_level_1: String(raw.category_level_1 || ""),
    category_level_2: String(raw.category_level_2 || ""),
    title: String(raw.title || ""),
    short_desc: String(raw.short_desc || ""),
    preset_input: String(raw.preset_input || ""),
    recommended_tones: parseRecommendedTones(raw.recommended_tones),
    priority: Number(raw.priority || 0),
    status: String(raw.status || "enabled"),
    sort_order: Number(raw.sort_order || 9999),
  };
}

function rankTemplates(list: ScenarioTemplate[]): ScenarioTemplate[] {
  const orderMap = HIGH_FREQUENCY_TEMPLATE_TITLES.reduce<Record<string, number>>(
    (acc, title, index) => {
      acc[title] = index;
      return acc;
    },
    {}
  );
  return [...list].sort((a, b) => {
    const ai = orderMap[a.title];
    const bi = orderMap[b.title];
    if (ai !== undefined && bi !== undefined) {
      return ai - bi;
    }
    if (ai !== undefined) {
      return -1;
    }
    if (bi !== undefined) {
      return 1;
    }
    return a.sort_order - b.sort_order;
  });
}

class TemplateService {
  async fetchTemplates(): Promise<ScenarioTemplate[]> {
    try {
      const rows = await selectRows<Record<string, unknown>>(
        "scenario_templates",
        {
          select:
            "id,template_code,category_level_1,category_level_2,title,short_desc,preset_input,recommended_tones,priority,status,sort_order",
          status: "eq.enabled",
          order: "sort_order.asc",
        }
      );
      const normalized = rows.map(normalizeTemplate);
      return normalized.sort((a, b) => a.sort_order - b.sort_order);
    } catch (error) {
      console.warn("[template.fetchTemplates] fallback enabled", error);
      return [...FALLBACK_TEMPLATES].sort((a, b) => a.sort_order - b.sort_order);
    }
  }

  async fetchHomeTemplates(limit = 8): Promise<ScenarioTemplate[]> {
    const templates = await this.fetchTemplates();
    return rankTemplates(templates).slice(0, limit);
  }
}

export const templateService = new TemplateService();
