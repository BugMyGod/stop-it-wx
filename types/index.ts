export type Tone =
  | "礼貌委婉"
  | "坚定直接"
  | "简短边界"
  | "温和留余地"
  | "留痕确认";

export type RefineType =
  | "more_direct"
  | "more_polite"
  | "shorter"
  | "wechat_style"
  | "more_boundary";

export interface ScenarioTemplate {
  id: string;
  template_code: string;
  category_level_1: string;
  category_level_2: string;
  title: string;
  short_desc: string;
  preset_input: string;
  recommended_tones: string[];
  priority: number;
  status: string;
  sort_order: number;
}

export interface GenerateReply {
  id?: string;
  style: Tone;
  text: string;
  note: string;
}

export interface GenerateResult {
  inputText: string;
  tone: Tone;
  replies: GenerateReply[];
}

export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface HistoryItem {
  id: string;
  inputSummary: string;
  inputText: string;
  tone: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  createdAt: string;
}

export interface HistoryDetail {
  recordId: string;
  inputText: string;
  tone: Tone;
  categoryLevel1?: string;
  categoryLevel2?: string;
  replies: GenerateReply[];
  createdAt: string;
}

export interface FavoriteItem {
  id: string;
  replyId: string;
  replyText: string;
  style: string;
  categoryText: string;
  createdAt: string;
}

export interface SubmitFeedbackPayload {
  content: string;
  contact?: string;
}

export interface SaveGenerationPayload {
  inputText: string;
  tone: Tone;
  templateId?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
  replies: GenerateReply[];
}

export interface SaveGenerationResult {
  source: "remote" | "local";
  recordId: string;
  replies: GenerateReply[];
}
