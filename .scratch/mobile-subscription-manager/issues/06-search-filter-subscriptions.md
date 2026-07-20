# 06 — 搜索和筛选订阅

**What to build:** 用户可以在 Subscriptions 中按名称快速搜索，并按 Status、Category 和 Billing Cycle 组合筛选已有记录，同时始终知道结果为空是因为筛选条件而不是数据加载失败。

**Blocked by:** 05 — 管理订阅完整生命周期.

**Status:** ready-for-agent

- [ ] 搜索按 Subscription Name 大小写不敏感匹配，并在输入变化后及时更新可见结果。
- [ ] 筛选支持 Active/Cancelled Status、固定 Category 和 Monthly/Yearly Billing Cycle，并允许组合条件。
- [ ] 默认列表显示 Active、非删除记录，并按 Next Billing Date 从近到远排序。
- [ ] 用户可以查看当前生效的筛选条件，并通过一个明确操作清除搜索与全部筛选。
- [ ] 搜索和筛选只改变呈现结果，不修改、删除或重新排序持久化数据本身。
- [ ] 无匹配结果时显示带有清除条件入口的 no-results 状态；数据库真正为空时仍显示首次使用空状态。
- [ ] 列表仍显示名称、Category、格式化金额、Billing Cycle、Next Billing Date 和状态，Yearly 项目保持明确标识。
- [ ] 所有控件、状态和辅助文本完整支持英文、简体中文、深浅主题和可访问名称。
- [ ] UI 级测试通过可见结果验证名称搜索、每类筛选、组合筛选、取消状态和 no-results 行为，不断言 Pinia 内部结构。
