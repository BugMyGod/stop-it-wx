import { authService } from "../../services/auth";
import { navigateWithFallback } from "../../utils/navigation";
import { showError, showSuccess } from "../../utils/toast";

interface LoginPageData {
  email: string;
  password: string;
  loading: boolean;
  redirect: string;
}

function safeDecode(raw?: string): string {
  if (!raw) {
    return "";
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

Page<LoginPageData>({
  data: {
    email: "",
    password: "",
    loading: false,
    redirect: "/pages/me/index",
  },

  onLoad(options: Record<string, string>) {
    const redirect = options.redirect ? safeDecode(options.redirect) : "/pages/me/index";
    this.setData({ redirect });
  },

  handleEmailInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({
      email: event.detail.value.trim(),
    });
  },

  handlePasswordInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({
      password: event.detail.value,
    });
  },

  async handleLogin() {
    if (!this.data.email) {
      showError("请输入邮箱");
      return;
    }
    if (!this.data.password) {
      showError("请输入密码");
      return;
    }

    this.setData({ loading: true });
    try {
      await authService.signInWithPassword(this.data.email, this.data.password);
      showSuccess("登录成功");
      navigateWithFallback(this.data.redirect);
    } catch (error) {
      showError(String((error as Error).message || "登录失败"));
    } finally {
      this.setData({ loading: false });
    }
  },

  handleBackHome() {
    wx.switchTab({ url: "/pages/index/index" });
  },
});
