import { authService } from "../../services/auth";
import { favoriteService } from "../../services/favorite";
import { FavoriteItem } from "../../types";
import { formatDateTime } from "../../utils/format";
import { showError, showSuccess } from "../../utils/toast";

interface FavoriteViewItem extends FavoriteItem {
  displayTime: string;
  displayCategory: string;
}

interface FavoritesPageData {
  loading: boolean;
  loggedIn: boolean;
  items: FavoriteViewItem[];
}

Page<FavoritesPageData>({
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
      this.setData({
        items: [],
      });
      return;
    }

    this.setData({ loading: true });
    try {
      const items = await favoriteService.listFavorites();
      this.setData({
        items: items.map((item) => ({
          ...item,
          displayTime: formatDateTime(item.createdAt),
          displayCategory: item.categoryText || "未分类",
        })),
      });
    } catch (error) {
      console.error("[favorites.refresh] failed", error);
      showError("收藏加载失败");
    } finally {
      this.setData({ loading: false });
    }
  },

  handleLogin() {
    authService.goLogin("/pages/favorites/index");
  },

  handleCopy(event: WechatMiniprogram.TouchEvent) {
    const text = String(event.currentTarget.dataset.text || "");
    if (!text) {
      return;
    }
    wx.setClipboardData({
      data: text,
      success: () => showSuccess("复制成功"),
      fail: () => showError("复制失败"),
    });
  },

  async handleUnfavorite(event: WechatMiniprogram.TouchEvent) {
    const replyId = String(event.currentTarget.dataset.replyid || "");
    if (!replyId) {
      return;
    }
    this.setData({ loading: true });
    try {
      await favoriteService.removeFavorite(replyId);
      showSuccess("取消收藏成功");
      await this.refresh();
    } catch (error) {
      showError(String((error as Error).message || "操作失败"));
      this.setData({ loading: false });
    }
  },
});
