import { CLIENT_TYPE } from "./config";
import { authService } from "./auth";
import { deleteRows, insertRows, selectRows, updateRows } from "./supabase";
import {
  GenerateReply,
  HistoryDetail,
  HistoryItem,
  SaveGenerationPayload,
  SaveGenerationResult,
  Tone,
} from "../types";
import { storage } from "../utils/storage";
import { summarizeText } from "../utils/format";

const LOCAL_HISTORY_KEY = "STOP_IT_LOCAL_HISTORY";
const LOCAL_HISTORY_LIMIT = 20;

interface LocalHistoryRecord {
  id: string;
  inputText: string;
  tone: Tone;
  categoryLevel1?: string;
  categoryLevel2?: string;
  createdAt: string;
  replies: GenerateReply[];
}

function safeTone(value: unknown): Tone {
  const text = String(value || "");
  const toneList: Tone[] = ["礼貌委婉", "坚定直接", "简短边界", "温和留余地", "留痕确认"];
  return toneList.includes(text as Tone) ? (text as Tone) : "礼貌委婉";
}

function readTextByCandidates(
  row: Record<string, unknown>,
  keys: string[],
  fallback = ""
): string {
  for (let i = 0; i < keys.length; i += 1) {
    const current = row[keys[i]];
    if (typeof current === "string" && current.trim()) {
      return current;
    }
  }
  return fallback;
}

function normalizeReplyRow(row: Record<string, unknown>): GenerateReply {
  return {
    id: String(row.id || ""),
    style: safeTone(row.style),
    text: readTextByCandidates(row, ["reply_text", "text", "content"]),
    note: readTextByCandidates(row, ["note", "desc"], ""),
  };
}

function buildLocalRecordId(): string {
  return `local_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

async function tryInsertScenarioRecord(payload: {
  userId: string;
  accessToken: string;
  inputText: string;
  tone: Tone;
  templateId?: string;
  categoryLevel1?: string;
  categoryLevel2?: string;
}): Promise<Record<string, unknown>> {
  const candidates: Array<Record<string, unknown>> = [
    {
      user_id: payload.userId,
      input_text: payload.inputText,
      tone: payload.tone,
      template_id: payload.templateId || null,
      category_level_1: payload.categoryLevel1 || null,
      category_level_2: payload.categoryLevel2 || null,
      client_type: CLIENT_TYPE,
    },
    {
      user_id: payload.userId,
      scenario_input: payload.inputText,
      tone: payload.tone,
      template_id: payload.templateId || null,
      category_level_1: payload.categoryLevel1 || null,
      category_level_2: payload.categoryLevel2 || null,
      client_type: CLIENT_TYPE,
    },
    {
      user_id: payload.userId,
      content: payload.inputText,
      tone: payload.tone,
      client_type: CLIENT_TYPE,
    },
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const rows = await insertRows<Record<string, unknown>>(
        "scenario_records",
        [candidates[i]],
        payload.accessToken
      );
      if (rows[0]) {
        return rows[0];
      }
    } catch (error) {
      if (i === candidates.length - 1) {
        throw error;
      }
    }
  }
  throw new Error("scenario_records 写入失败");
}

async function tryInsertGeneratedReply(payload: {
  recordId: string;
  userId: string;
  accessToken: string;
  reply: GenerateReply;
}): Promise<GenerateReply> {
  const candidates: Array<Record<string, unknown>> = [
    {
      scenario_record_id: payload.recordId,
      user_id: payload.userId,
      style: payload.reply.style,
      reply_text: payload.reply.text,
      note: payload.reply.note,
      client_type: CLIENT_TYPE,
    },
    {
      scenario_record_id: payload.recordId,
      user_id: payload.userId,
      style: payload.reply.style,
      text: payload.reply.text,
      note: payload.reply.note,
      client_type: CLIENT_TYPE,
    },
    {
      scenario_record_id: payload.recordId,
      user_id: payload.userId,
      style: payload.reply.style,
      content: payload.reply.text,
      note: payload.reply.note,
      client_type: CLIENT_TYPE,
    },
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const rows = await insertRows<Record<string, unknown>>(
        "generated_replies",
        [candidates[i]],
        payload.accessToken
      );
      if (rows[0]) {
        return {
          id: String(rows[0].id || ""),
          style: payload.reply.style,
          text: payload.reply.text,
          note: payload.reply.note,
        };
      }
    } catch (error) {
      if (i === candidates.length - 1) {
        throw error;
      }
    }
  }
  throw new Error("generated_replies 写入失败");
}

function readLocalHistory(): LocalHistoryRecord[] {
  return storage.get<LocalHistoryRecord[]>(LOCAL_HISTORY_KEY) || [];
}

function saveLocalHistoryItem(record: LocalHistoryRecord): SaveGenerationResult {
  const history = readLocalHistory();
  const next = [record, ...history].slice(0, LOCAL_HISTORY_LIMIT);
  storage.set(LOCAL_HISTORY_KEY, next);
  return {
    source: "local",
    recordId: record.id,
    replies: record.replies,
  };
}

class HistoryService {
  async saveGeneration(payload: SaveGenerationPayload): Promise<SaveGenerationResult> {
    const session = authService.getSession();
    if (!session) {
      return saveLocalHistoryItem({
        id: buildLocalRecordId(),
        inputText: payload.inputText,
        tone: payload.tone,
        categoryLevel1: payload.categoryLevel1,
        categoryLevel2: payload.categoryLevel2,
        createdAt: new Date().toISOString(),
        replies: payload.replies.map((reply, index) => ({
          ...reply,
          id: `local_reply_${Date.now()}_${index}`,
        })),
      });
    }

    try {
      const record = await tryInsertScenarioRecord({
        userId: session.user.id,
        accessToken: session.accessToken,
        inputText: payload.inputText,
        tone: payload.tone,
        templateId: payload.templateId,
        categoryLevel1: payload.categoryLevel1,
        categoryLevel2: payload.categoryLevel2,
      });
      const recordId = String(record.id || "");
      if (!recordId) {
        throw new Error("未拿到 scenario_records.id");
      }

      const savedReplies: GenerateReply[] = [];
      for (let i = 0; i < payload.replies.length; i += 1) {
        const saved = await tryInsertGeneratedReply({
          recordId,
          userId: session.user.id,
          accessToken: session.accessToken,
          reply: payload.replies[i],
        });
        savedReplies.push(saved);
      }

      return {
        source: "remote",
        recordId,
        replies: savedReplies,
      };
    } catch (error) {
      console.warn("[history.saveGeneration] fallback local", error);
      return saveLocalHistoryItem({
        id: buildLocalRecordId(),
        inputText: payload.inputText,
        tone: payload.tone,
        categoryLevel1: payload.categoryLevel1,
        categoryLevel2: payload.categoryLevel2,
        createdAt: new Date().toISOString(),
        replies: payload.replies.map((reply, index) => ({
          ...reply,
          id: `local_reply_${Date.now()}_${index}`,
        })),
      });
    }
  }

  async listHistory(): Promise<HistoryItem[]> {
    const session = authService.getSession();
    if (!session) {
      return [];
    }

    const rows = await selectRows<Record<string, unknown>>(
      "scenario_records",
      {
        select: "*",
        user_id: `eq.${session.user.id}`,
        order: "created_at.desc",
      },
      session.accessToken
    );

    return rows.map((row) => {
      const inputText = readTextByCandidates(row, ["input_text", "scenario_input", "content"], "");
      return {
        id: String(row.id || ""),
        inputSummary: summarizeText(inputText, 20),
        inputText,
        tone: String(row.tone || ""),
        categoryLevel1: String(row.category_level_1 || ""),
        categoryLevel2: String(row.category_level_2 || ""),
        createdAt: String(row.created_at || ""),
      };
    });
  }

  async getHistoryDetail(recordId: string): Promise<HistoryDetail> {
    const session = authService.getSession();
    if (!session) {
      throw new Error("请先登录");
    }

    const records = await selectRows<Record<string, unknown>>(
      "scenario_records",
      {
        select: "*",
        id: `eq.${recordId}`,
        user_id: `eq.${session.user.id}`,
        limit: 1,
      },
      session.accessToken
    );
    if (!records[0]) {
      throw new Error("未找到该历史记录");
    }

    const replies = await selectRows<Record<string, unknown>>(
      "generated_replies",
      {
        select: "*",
        scenario_record_id: `eq.${recordId}`,
        order: "created_at.asc",
      },
      session.accessToken
    );

    const record = records[0];
    const inputText = readTextByCandidates(record, ["input_text", "scenario_input", "content"], "");
    return {
      recordId,
      inputText,
      tone: safeTone(record.tone),
      categoryLevel1: String(record.category_level_1 || ""),
      categoryLevel2: String(record.category_level_2 || ""),
      replies: replies.map(normalizeReplyRow),
      createdAt: String(record.created_at || ""),
    };
  }

  async deleteHistory(recordId: string): Promise<void> {
    const session = authService.getSession();
    if (!session) {
      throw new Error("请先登录");
    }

    await deleteRows(
      "generated_replies",
      {
        scenario_record_id: `eq.${recordId}`,
      },
      session.accessToken
    ).catch(() => {
      return [];
    });

    await deleteRows(
      "scenario_records",
      {
        id: `eq.${recordId}`,
        user_id: `eq.${session.user.id}`,
      },
      session.accessToken
    );
  }

  async updateReply(replyId: string, text: string, note: string): Promise<void> {
    const session = authService.getSession();
    if (!session || !replyId) {
      return;
    }
    await updateRows(
      "generated_replies",
      {
        reply_text: text,
        note,
      },
      {
        id: `eq.${replyId}`,
      },
      session.accessToken
    ).catch(async () => {
      await updateRows(
        "generated_replies",
        {
          text,
          note,
        },
        {
          id: `eq.${replyId}`,
        },
        session.accessToken
      );
    });
  }
}

export const historyService = new HistoryService();
