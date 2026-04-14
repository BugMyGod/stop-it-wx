import { authService } from "./auth";
import { deleteRows, insertRows, selectRows } from "./supabase";
import { FavoriteItem } from "../types";

function toInFilter(values: string[]): string {
  return `in.(${values.map((item) => `"${item}"`).join(",")})`;
}

function readText(row: Record<string, unknown>): string {
  const text = row.reply_text || row.text || row.content || "";
  return String(text);
}

function readCategory(row: Record<string, unknown>): { level1: string; level2: string } {
  return {
    level1: String(row.category_level_1 || ""),
    level2: String(row.category_level_2 || ""),
  };
}

class FavoriteService {
  async listFavorites(): Promise<FavoriteItem[]> {
    const session = authService.getSession();
    if (!session) {
      return [];
    }

    const favorites = await selectRows<Record<string, unknown>>(
      "favorites",
      {
        select: "*",
        user_id: `eq.${session.user.id}`,
        order: "created_at.desc",
      },
      session.accessToken
    );
    if (favorites.length === 0) {
      return [];
    }

    const replyIds = favorites
      .map((item) => String(item.reply_id || ""))
      .filter((item) => !!item);
    if (replyIds.length === 0) {
      return [];
    }

    const replies = await selectRows<Record<string, unknown>>(
      "generated_replies",
      {
        select: "*",
        id: toInFilter(replyIds),
      },
      session.accessToken
    );
    const replyMap = replies.reduce<Record<string, Record<string, unknown>>>((acc, item) => {
      const id = String(item.id || "");
      if (id) {
        acc[id] = item;
      }
      return acc;
    }, {});

    const recordIds = replies
      .map((item) => String(item.scenario_record_id || ""))
      .filter((item) => !!item);
    let recordMap: Record<string, Record<string, unknown>> = {};
    if (recordIds.length > 0) {
      const records = await selectRows<Record<string, unknown>>(
        "scenario_records",
        {
          select: "*",
          id: toInFilter(recordIds),
        },
        session.accessToken
      );
      recordMap = records.reduce<Record<string, Record<string, unknown>>>((acc, item) => {
        const id = String(item.id || "");
        if (id) {
          acc[id] = item;
        }
        return acc;
      }, {});
    }

    return favorites.map((favorite) => {
      const replyId = String(favorite.reply_id || "");
      const reply = replyMap[replyId] || {};
      const record = recordMap[String(reply.scenario_record_id || "")] || {};
      const replyCategory = readCategory(reply);
      const recordCategory = readCategory(record);
      const categoryLevel1 = replyCategory.level1 || recordCategory.level1;
      const categoryLevel2 = replyCategory.level2 || recordCategory.level2;
      return {
        id: String(favorite.id || ""),
        replyId,
        replyText: readText(reply),
        style: String(reply.style || ""),
        categoryText: [categoryLevel1, categoryLevel2].filter(Boolean).join(" / "),
        createdAt: String(favorite.created_at || ""),
      };
    });
  }

  async addFavorite(replyId: string): Promise<void> {
    const session = authService.getSession();
    if (!session) {
      throw new Error("请先登录");
    }

    await insertRows(
      "favorites",
      [
        {
          user_id: session.user.id,
          reply_id: replyId,
        },
      ],
      session.accessToken
    ).catch((error) => {
      const message = String((error as Error).message || "");
      if (!message.includes("duplicate")) {
        throw error;
      }
    });
  }

  async removeFavorite(replyId: string): Promise<void> {
    const session = authService.getSession();
    if (!session) {
      throw new Error("请先登录");
    }
    await deleteRows(
      "favorites",
      {
        user_id: `eq.${session.user.id}`,
        reply_id: `eq.${replyId}`,
      },
      session.accessToken
    );
  }

  async getFavoriteReplyIdSet(replyIds: string[]): Promise<Set<string>> {
    const session = authService.getSession();
    if (!session || replyIds.length === 0) {
      return new Set<string>();
    }

    const rows = await selectRows<Record<string, unknown>>(
      "favorites",
      {
        select: "reply_id",
        user_id: `eq.${session.user.id}`,
        reply_id: toInFilter(replyIds),
      },
      session.accessToken
    );
    return new Set(rows.map((item) => String(item.reply_id || "")));
  }
}

export const favoriteService = new FavoriteService();
