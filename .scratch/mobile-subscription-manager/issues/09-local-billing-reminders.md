# 09 — 接收本地扣费提醒

**What to build:** 用户可以在 Settings 中主动启用扣费提醒、选择提前天数，并在没有服务器或网络连接的情况下按设备本地时间收到与当前 Subscription 数据一致的通知。

**Blocked by:** 05 — 管理订阅完整生命周期.

**Status:** ready-for-agent

- [ ] 应用首次启动时不主动请求通知权限；只有用户启用提醒时才触发系统权限流程。
- [ ] Settings 显示提醒启用状态和可选择的提前天数，默认提前三天并在设备本地时间 09:00 调度。
- [ ] 授权成功后，Active Subscription 在未来至少十二个月的支持范围内生成与 Billing Cycle、Billing Anchor 和 Next Billing Date 一致的本地通知计划，同时遵守平台数量限制。
- [ ] 通知标题和正文包含足以识别 Subscription 与扣费日期的信息，并使用用户当前选择的 English 或简体中文。
- [ ] 创建、编辑、取消、重新启用、删除 Subscription，以及修改 Language、Currency 或提醒设置后，待处理通知会被统一核对和重建。
- [ ] Cancelled 或 deleted Subscription 不保留待处理通知，禁用全局提醒会移除应用创建的相关通知。
- [ ] 权限被拒绝时，应用不声称通知已启用，并提供进入系统设置或稍后重试的清晰恢复说明。
- [ ] Billing Date 保持 date-only 语义；通知时刻从当前设备时区派生，时区变化不会改变用户预期的 Billing Date。
- [ ] 自动化测试通过薄 notification fake/spy 验证预期通知集合和用户可见日期，不依赖真实系统时钟或断言插件私有调用。
- [ ] Android 手工 smoke check 验证权限允许、权限拒绝、离线投递及取消记录后不再投递；完整发布验证保留给最终候选版本票据。
