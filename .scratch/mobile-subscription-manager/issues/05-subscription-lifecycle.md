# 05 — 管理订阅完整生命周期

**What to build:** 用户可以从 Subscription Details 编辑、取消、重新启用或永久删除一项 Subscription，并立即看到所有已有列表、汇总和日期信息与最新状态一致。

**Blocked by:** 03 — 个性化主题、语言与单一币种; 04 — 正确追踪月付与年付续费.

**Status:** ready-for-agent

- [ ] 用户可以从 Subscription Details 进入编辑流程，修改名称、金额、Billing Cycle、Next Billing Date、Category、Plan Name 和 Payment Method Label。
- [ ] 成功编辑后，详情、列表和已有 Overview 汇总立即反映新值；取消编辑或写入失败保留原数据。
- [ ] 用户可以把 Active Subscription 标记为 Cancelled，并保留其详情与历史信息。
- [ ] Cancelled Subscription 不再进入有效数量、未来扣费、Normalized Monthly Recurring Cost 或默认 Active 列表结果。
- [ ] 用户可以重新启用 Cancelled Subscription；若其日期已过去，Next Billing Date 会按 Billing Anchor 推进到当前或未来的有效周期。
- [ ] 用户可以在明确确认后永久删除 Subscription；取消确认不改变数据，成功删除后面向用户的查询不再返回该记录。
- [ ] 删除操作维护规格要求的 deletion/version metadata，同时不向 UI 暴露内部同步字段。
- [ ] 每次生命周期写入均为原子操作，失败时不留下跨页面不一致或部分更新。
- [ ] 中英文文案、深浅主题和 Currency 格式在所有新增管理操作中保持一致。
- [ ] 高层行为测试覆盖“编辑 → 取消 → 排除汇总 → 重新启用并推进日期 → 确认删除”的用户可见结果。
