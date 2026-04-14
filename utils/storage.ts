export const storage = {
  get<T>(key: string): T | null {
    try {
      return (wx.getStorageSync(key) as T) || null;
    } catch (error) {
      console.warn("[storage.get] failed", key, error);
      return null;
    }
  },
  set<T>(key: string, value: T) {
    try {
      wx.setStorageSync(key, value);
    } catch (error) {
      console.warn("[storage.set] failed", key, error);
    }
  },
  remove(key: string) {
    try {
      wx.removeStorageSync(key);
    } catch (error) {
      console.warn("[storage.remove] failed", key, error);
    }
  },
};
