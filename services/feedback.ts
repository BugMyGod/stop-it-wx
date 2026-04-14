import { CLIENT_TYPE } from "./config";
import { authService } from "./auth";
import { insertRows } from "./supabase";
import { SubmitFeedbackPayload } from "../types";

class FeedbackService {
  async submit(payload: SubmitFeedbackPayload): Promise<void> {
    const session = authService.getSession();
    if (!session) {
      throw new Error("请先登录");
    }
    const content = payload.content.trim();
    if (!content) {
      throw new Error("请输入反馈内容");
    }

    const candidates: Array<Record<string, unknown>> = [
      {
        user_id: session.user.id,
        content,
        contact: payload.contact || null,
        client_type: CLIENT_TYPE,
      },
      {
        user_id: session.user.id,
        feedback_text: content,
        contact: payload.contact || null,
        client_type: CLIENT_TYPE,
      },
      {
        user_id: session.user.id,
        message: content,
        contact: payload.contact || null,
        client_type: CLIENT_TYPE,
      },
    ];

    for (let i = 0; i < candidates.length; i += 1) {
      try {
        await insertRows("feedback", [candidates[i]], session.accessToken);
        return;
      } catch (error) {
        if (i === candidates.length - 1) {
          throw error;
        }
      }
    }
  }
}

export const feedbackService = new FeedbackService();
