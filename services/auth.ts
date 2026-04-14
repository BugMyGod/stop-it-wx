import { request } from "./request";
import { upsertRows } from "./supabase";
import { AuthSession, AuthUser } from "../types";
import { buildLoginPath } from "../utils/navigation";
import { storage } from "../utils/storage";

const SESSION_KEY = "STOP_IT_AUTH_SESSION";

interface SupabaseLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
}

class AuthService {
  private session: AuthSession | null = null;

  bootstrap() {
    const saved = storage.get<AuthSession>(SESSION_KEY);
    if (!saved) {
      return;
    }
    if (saved.expiresAt && saved.expiresAt > Date.now()) {
      this.session = saved;
      return;
    }
    storage.remove(SESSION_KEY);
    this.session = null;
  }

  getSession(): AuthSession | null {
    if (!this.session) {
      return null;
    }
    if (this.session.expiresAt <= Date.now()) {
      this.signOut();
      return null;
    }
    return this.session;
  }

  getCurrentUser(): AuthUser | null {
    const session = this.getSession();
    if (!session) {
      return null;
    }
    return session.user;
  }

  getAccessToken(): string | undefined {
    return this.getSession()?.accessToken;
  }

  isLoggedIn(): boolean {
    return !!this.getSession();
  }

  async signInWithPassword(email: string, password: string): Promise<AuthUser> {
    const payload = await request<SupabaseLoginResponse>({
      path: "/auth/v1/token",
      method: "POST",
      query: {
        grant_type: "password",
      },
      data: {
        email,
        password,
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    const nextSession: AuthSession = {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresAt: Date.now() + payload.expires_in * 1000,
      user: {
        id: payload.user.id,
        email: payload.user.email,
      },
    };
    this.session = nextSession;
    storage.set(SESSION_KEY, nextSession);

    this.syncProfilePlaceholder().catch((error) => {
      console.warn("[auth.syncProfilePlaceholder] failed", error);
    });

    return nextSession.user;
  }

  signOut() {
    this.session = null;
    storage.remove(SESSION_KEY);
  }

  goLogin(redirectPath?: string) {
    wx.navigateTo({
      url: buildLoginPath(redirectPath),
    });
  }

  requireLogin(redirectPath?: string): boolean {
    if (this.isLoggedIn()) {
      return true;
    }
    this.goLogin(redirectPath);
    return false;
  }

  async syncProfilePlaceholder() {
    const session = this.getSession();
    if (!session) {
      return;
    }
    const accessToken = session.accessToken;
    const payloadCandidates: Array<Record<string, unknown>> = [
      {
        id: session.user.id,
      },
      {
        id: session.user.id,
        email: session.user.email || null,
      },
      {
        id: session.user.id,
        display_name: session.user.email || "StopIt 用户",
      },
    ];

    for (let i = 0; i < payloadCandidates.length; i += 1) {
      try {
        await upsertRows("profiles", [payloadCandidates[i]], "id", accessToken);
        return;
      } catch (error) {
        if (i === payloadCandidates.length - 1) {
          throw error;
        }
      }
    }
  }
}

export const authService = new AuthService();
