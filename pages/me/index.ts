import { authService } from "../../services/auth";
import { showSuccess } from "../../utils/toast";

interface MePageData {
  loggedIn: boolean;
  userId: string;
  email: string;
  userDisplay: string;
  authBtnText: string;
  authBtnClass: string;
}

Page<MePageData>({
  data: {
    loggedIn: false,
    userId: "",
    email: "",
    userDisplay: "",
    authBtnText: "登录",
    authBtnClass: "primary-btn",
  },

  onShow() {
    this.refreshUser();
  },

  refreshUser() {
    const user = authService.getCurrentUser();
    this.setData({
      loggedIn: !!user,
      userId: user?.id || "",
      email: user?.email || "",
      userDisplay: user?.email || user?.id || "",
      authBtnText: user ? "退出登录" : "登录",
      authBtnClass: user ? "danger-btn" : "primary-btn",
    });
  },

  goFavorites() {
    wx.switchTab({ url: "/pages/favorites/index" });
  },

  goHistory() {
    wx.switchTab({ url: "/pages/history/index" });
  },

  goFeedback() {
    wx.navigateTo({ url: "/pages/feedback/index" });
  },

  showAbout() {
    wx.showModal({
      title: "关于 StopIt",
      content: "拒绝是你的权利，不必解释太多。StopIt 帮你快速生成可直接发送的边界表达话术。",
      showCancel: false,
      confirmColor: "#2fa394",
    });
  },

  handleAuthAction() {
    if (this.data.loggedIn) {
      authService.signOut();
      this.refreshUser();
      showSuccess("已退出登录");
      return;
    }
    authService.goLogin("/pages/me/index");
  },
});
