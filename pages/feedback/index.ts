import { authService } from "../../services/auth";
import { feedbackService } from "../../services/feedback";
import { showError, showSuccess } from "../../utils/toast";

interface FeedbackPageData {
  loggedIn: boolean;
  content: string;
  contact: string;
  loading: boolean;
}

Page<FeedbackPageData>({
  data: {
    loggedIn: false,
    content: "",
    contact: "",
    loading: false,
  },

  onShow() {
    this.setData({
      loggedIn: authService.isLoggedIn(),
    });
  },

  handleLogin() {
    authService.goLogin("/pages/feedback/index");
  },

  handleContentInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({
      content: event.detail.value,
    });
  },

  handleContactInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({
      contact: event.detail.value.trim(),
    });
  },

  async handleSubmit() {
    if (!authService.requireLogin("/pages/feedback/index")) {
      return;
    }
    if (!this.data.content.trim()) {
      showError("请先填写反馈内容");
      return;
    }

    this.setData({ loading: true });
    try {
      await feedbackService.submit({
        content: this.data.content.trim(),
        contact: this.data.contact.trim(),
      });
      showSuccess("反馈提交成功");
      this.setData({
        content: "",
        contact: "",
      });
    } catch (error) {
      showError(String((error as Error).message || "提交失败"));
    } finally {
      this.setData({ loading: false });
    }
  },
});
