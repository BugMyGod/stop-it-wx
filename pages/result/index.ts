import { favoriteService } from "../../services/favorite";
import { generateService } from "../../services/generate";
import { historyService } from "../../services/history";
import { authService } from "../../services/auth";
import { GenerateReply, RefineType, Tone } from "../../types";
import { showError, showSuccess } from "../../utils/toast";

interface ReplyView extends GenerateReply {
  isFavorite: boolean;
  favoriteLoading: boolean;
}

interface ResultPageData {
  loading: boolean;
  inputText: string;
  tone: Tone;
  templateId: string;
  categoryLevel1: string;
  categoryLevel2: string;
  categoryText: string;
  recordId: string;
  replies: ReplyView[];
  errorMessage: string;
}

const REFINE_ACTIONS: Array<{ label: string; value: RefineType }> = [
  { label: "更直接一点", value: "more_direct" },
  { label: "更委婉一点", value: "more_polite" },
  { label: "更短一点", value: "shorter" },
  { label: "更适合微信", value: "wechat_style" },
  { label: "更有边界感一点", value: "more_boundary" },
];

function decodeQueryValue(raw?: string): string {
  if (!raw) {
    return "";
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function buildCategoryText(categoryLevel1: string, categoryLevel2: string): string {
  return [categoryLevel1, categoryLevel2].filter(Boolean).join(" / ");
}

Page<ResultPageData>({
  data: {
    loading: false,
    inputText: "",
    tone: "礼貌委婉",
    templateId: "",
    categoryLevel1: "",
    categoryLevel2: "",
    categoryText: "",
    recordId: "",
    replies: [],
    errorMessage: "",
  },

  onLoad(options: Record<string, string>) {
    const recordId = decodeQueryValue(options.recordId);
    if (recordId) {
      this.loadHistoryDetail(recordId);
      return;
    }

    const categoryLevel1 = decodeQueryValue(options.category1);
    const categoryLevel2 = decodeQueryValue(options.category2);
    this.setData({
      inputText: decodeQueryValue(options.input),
      tone: (decodeQueryValue(options.tone) as Tone) || "礼貌委婉",
      templateId: decodeQueryValue(options.templateId),
      categoryLevel1,
      categoryLevel2,
      categoryText: buildCategoryText(categoryLevel1, categoryLevel2),
    });
    this.generateAndPersist();
  },

  onShow() {
    if (this.data.replies.length > 0) {
      this.syncFavoriteState();
    }
  },

  async generateAndPersist() {
    const inputText = this.data.inputText.trim();
    if (!inputText) {
      this.setData({ errorMessage: "缺少场景输入内容" });
      return;
    }

    this.setData({
      loading: true,
      errorMessage: "",
    });
    try {
      const generatedReplies = await generateService.generateReplies({
        inputText,
        preferredTone: this.data.tone,
      });
      const saved = await historyService.saveGeneration({
        inputText,
        tone: this.data.tone,
        templateId: this.data.templateId,
        categoryLevel1: this.data.categoryLevel1,
        categoryLevel2: this.data.categoryLevel2,
        replies: generatedReplies,
      });
      this.setData({
        recordId: saved.recordId,
        replies: saved.replies.map((reply) => ({
          ...reply,
          isFavorite: false,
          favoriteLoading: false,
        })),
      });
      await this.syncFavoriteState();
    } catch (error) {
      console.error("[result.generateAndPersist] failed", error);
      this.setData({
        errorMessage: "生成失败，请稍后再试",
      });
      showError("生成失败");
    } finally {
      this.setData({
        loading: false,
      });
    }
  },

  async loadHistoryDetail(recordId: string) {
    this.setData({
      loading: true,
      errorMessage: "",
      recordId,
    });
    try {
      const detail = await historyService.getHistoryDetail(recordId);
      this.setData({
        inputText: detail.inputText,
        tone: detail.tone,
        categoryLevel1: detail.categoryLevel1 || "",
        categoryLevel2: detail.categoryLevel2 || "",
        categoryText: buildCategoryText(detail.categoryLevel1 || "", detail.categoryLevel2 || ""),
        replies: detail.replies.map((reply) => ({
          ...reply,
          isFavorite: false,
          favoriteLoading: false,
        })),
      });
      await this.syncFavoriteState();
    } catch (error) {
      console.error("[result.loadHistoryDetail] failed", error);
      this.setData({ errorMessage: String((error as Error).message || "加载失败") });
      showError("历史详情加载失败");
    } finally {
      this.setData({ loading: false });
    }
  },

  async syncFavoriteState() {
    const current = this.data.replies;
    if (!authService.isLoggedIn()) {
      this.setData({
        replies: current.map((item) => ({
          ...item,
          isFavorite: false,
        })),
      });
      return;
    }

    const replyIds = current
      .map((item) => item.id || "")
      .filter((id) => !!id && !id.startsWith("local_"));
    if (replyIds.length === 0) {
      return;
    }

    try {
      const favoriteIdSet = await favoriteService.getFavoriteReplyIdSet(replyIds);
      this.setData({
        replies: current.map((item) => ({
          ...item,
          isFavorite: !!item.id && favoriteIdSet.has(item.id),
        })),
      });
    } catch (error) {
      console.warn("[result.syncFavoriteState] failed", error);
    }
  },

  handleCopy(event: WechatMiniprogram.CustomEvent<{ index: number }>) {
    const index = event.detail.index;
    const target = this.data.replies[index];
    if (!target) {
      return;
    }
    wx.setClipboardData({
      data: target.text,
      success: () => {
        showSuccess("复制成功");
      },
      fail: () => {
        showError("复制失败");
      },
    });
  },

  async handleFavorite(event: WechatMiniprogram.CustomEvent<{ index: number }>) {
    const index = event.detail.index;
    const target = this.data.replies[index];
    if (!target) {
      return;
    }

    if (!authService.requireLogin(this.buildCurrentPath())) {
      return;
    }
    if (!target.id || target.id.startsWith("local_")) {
      showError("请登录后重新生成一次再收藏");
      return;
    }

    const replies = [...this.data.replies];
    replies[index] = {
      ...target,
      favoriteLoading: true,
    };
    this.setData({ replies });

    try {
      if (target.isFavorite) {
        await favoriteService.removeFavorite(target.id);
        replies[index].isFavorite = false;
        showSuccess("取消收藏成功");
      } else {
        await favoriteService.addFavorite(target.id);
        replies[index].isFavorite = true;
        showSuccess("收藏成功");
      }
    } catch (error) {
      showError(String((error as Error).message || "收藏失败"));
    } finally {
      replies[index].favoriteLoading = false;
      this.setData({ replies });
    }
  },

  handleRefine(event: WechatMiniprogram.CustomEvent<{ index: number }>) {
    const index = event.detail.index;
    const target = this.data.replies[index];
    if (!target) {
      return;
    }
    wx.showActionSheet({
      itemList: REFINE_ACTIONS.map((item) => item.label),
      success: async (res) => {
        const action = REFINE_ACTIONS[res.tapIndex];
        if (!action) {
          return;
        }
        try {
          wx.showLoading({ title: "微调中..." });
          const refined = await generateService.refineReply({
            inputText: this.data.inputText,
            currentReply: target.text,
            style: target.style,
            refineType: action.value,
          });
          const replies = [...this.data.replies];
          replies[index] = {
            ...replies[index],
            text: refined.text,
            note: refined.note,
          };
          this.setData({ replies });
          if (target.id && !target.id.startsWith("local_")) {
            await historyService.updateReply(target.id, refined.text, refined.note);
          }
          showSuccess("微调完成");
        } catch (error) {
          showError(String((error as Error).message || "微调失败"));
        } finally {
          wx.hideLoading();
        }
      },
    });
  },

  handleRegenerate() {
    this.generateAndPersist();
  },

  buildCurrentPath(): string {
    const query = [
      `input=${encodeURIComponent(this.data.inputText)}`,
      `tone=${encodeURIComponent(this.data.tone)}`,
      `templateId=${encodeURIComponent(this.data.templateId || "")}`,
      `category1=${encodeURIComponent(this.data.categoryLevel1 || "")}`,
      `category2=${encodeURIComponent(this.data.categoryLevel2 || "")}`,
    ].join("&");
    return `/pages/result/index?${query}`;
  },
});
