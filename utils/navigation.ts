const TAB_PAGES = new Set([
  "/pages/index/index",
  "/pages/favorites/index",
  "/pages/history/index",
  "/pages/me/index",
]);

export function navigateWithFallback(path: string) {
  if (!path) {
    wx.switchTab({ url: "/pages/me/index" });
    return;
  }

  if (TAB_PAGES.has(path)) {
    wx.switchTab({ url: path });
    return;
  }

  wx.redirectTo({ url: path });
}

export function buildLoginPath(redirectPath?: string): string {
  if (!redirectPath) {
    return "/pages/login/index";
  }
  return `/pages/login/index?redirect=${encodeURIComponent(redirectPath)}`;
}
