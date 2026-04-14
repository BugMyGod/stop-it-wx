import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface RequestOptions {
  path: string;
  method?: HttpMethod;
  query?: Record<string, string | number | boolean | undefined>;
  data?: Record<string, unknown> | Array<Record<string, unknown>>;
  headers?: Record<string, string>;
  accessToken?: string;
  timeout?: number;
}

export class RequestError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "RequestError";
    this.statusCode = statusCode;
  }
}

function withQuery(path: string, query?: RequestOptions["query"]): string {
  if (!query) {
    return path;
  }
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  if (parts.length === 0) {
    return path;
  }
  return `${path}${path.includes("?") ? "&" : "?"}${parts.join("&")}`;
}

function normalizePath(path: string): string {
  if (path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "请求失败";
  }
  const raw = payload as Record<string, unknown>;
  const message =
    (raw.message as string) ||
    (raw.error_description as string) ||
    (raw.error as string) ||
    (raw.msg as string);
  return message || "请求失败";
}

export function request<T>(options: RequestOptions): Promise<T> {
  const url = `${SUPABASE_URL}${withQuery(normalizePath(options.path), options.query)}`;
  const method = options.method || "GET";
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  return new Promise<T>((resolve, reject) => {
    wx.request({
      url,
      method,
      data: options.data,
      header: headers,
      timeout: options.timeout || 15000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
          return;
        }
        reject(new RequestError(extractErrorMessage(res.data), res.statusCode));
      },
      fail(err) {
        reject(new RequestError(err.errMsg || "网络异常", 0));
      },
    });
  });
}
