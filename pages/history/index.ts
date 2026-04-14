import { authService } from "../../services/auth";
import { historyService } from "../../services/history";
import { HistoryItem } from "../../types";
import { formatDateTime } from "../../utils/format";
import { showError, showSuccess } from "../../utils/toast";

interface HistoryViewItem extends HistoryItem {
  displayTime: string;
  categoryText: string;
}

interface HistoryPageData {
  loading: boolean;
  loggedIn: boolean;
  items: HistoryViewItem[];
}

Page<HistoryPageData>({
  data: {
    loading: false,
    loggedIn: false,
    items: [],
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const loggedIn = authService.isLoggedIn();
    this.setData({
      loggedIn,
    });
    if (!loggedIn) {
      this.setData({ items: [] });
      return;
    }

    this.setData({ loading: true });
    try {
      const items = await historyService.listHistory();
      this.setData({
        items: items.map((item) => ({
          ...item,
          displayTime: formatDateTime(item.createdAt),
          categoryText: [item.categoryLevel1 || "未分类", item.categoryLevel2]
            .filter(Boolean)
            .join(" / "),
        })),
      });
    } catch (error) {
      console.error("[history.refresh] failed", error);
      showError("历史加载失败");
    } finally {
      this.setData({ loading: false });
    }
  },

  handleLogin() {
    authService.goLogin("/pages/history/index");
  },

  handleViewDetail(event: WechatMiniprogram.TouchEvent) {
    const recordId = String(event.currentTarget.dataset.id || "");
    if (!recordId) {
      return;
    }
    wx.navigateTo({
      url: `/pages/result/index?recordId=${encodeURIComponent(recordId)}`,
    });
  },

  handleDelete(event: WechatMiniprogram.TouchEvent) {
    const recordId = String(event.currentTarget.dataset.id || "");
    if (!recordId) {
      return;
    }
    wx.showModal({
      title: "删除历史",
      content: "确定删除这条历史记录吗？",
      confirmColor: "#2fa394",
      success: async (res) => {
        if (!res.confirm) {
          return;
        }
        try {
          this.setData({ loading: true });
          await historyService.deleteHistory(recordId);
          showSuccess("删除成功");
          await this.refresh();
        } catch (error) {
          showError(String((error as Error).message || "删除失败"));
          this.setData({ loading: false });
        }
      },
    });
  },
});
