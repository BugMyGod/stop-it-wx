export function showSuccess(title: string) {
  wx.showToast({
    title,
    icon: "success",
    duration: 1800,
  });
}

export function showError(title: string) {
  wx.showToast({
    title,
    icon: "none",
    duration: 2200,
  });
}
