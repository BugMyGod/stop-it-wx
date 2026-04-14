# stop-it-wx

StopIt 微信小程序（MVP）

## 项目说明

- 产品名：`StopIt回应助手`
- 技术栈：微信原生小程序 + TypeScript
- 核心能力：场景输入、模板选择、语气选择、生成 3 条回应、复制、收藏、历史、反馈、登录拦截
- 数据后端：同 Supabase 项目（与 Web 共用表）

## 运行前配置

请先编辑 `config/env.ts`：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

```ts
export const ENV = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  CLIENT_TYPE: "wechat_mp",
};
```

## 页面结构

- `pages/index/index` 首页
- `pages/result/index` 结果页
- `pages/favorites/index` 收藏页
- `pages/history/index` 历史页
- `pages/me/index` 我的页
- `pages/login/index` 登录页
- `pages/feedback/index` 反馈页

## 关键服务

- `services/request.ts`：`wx.request` HTTP 封装
- `services/supabase.ts`：Supabase REST 封装
- `services/template.ts`：模板读取（失败回退本地模板）
- `services/generate.ts`：MVP mock 生成与微调
- `services/history.ts`：历史记录（登录走远端，未登录走本地 storage）
- `services/favorite.ts`：收藏读写
- `services/feedback.ts`：反馈提交
- `services/auth.ts`：登录态管理与拦截

## 说明

- 本版本登录使用邮箱密码方案，后续可在 `authService` 中扩展微信登录，不影响上层业务调用。
- 结果生成当前为 mock，返回结构已按未来真实 AI 接口兼容设计。
