# 02 — 记录并持久化第一个月付订阅

**What to build:** 用户可以从 Overview 或 Subscriptions 发起新增流程，记录一个月付 Subscription，并立即在列表、详情和最小概览中看到它；记录经过真实 SQLite 持久化，关闭并重新打开应用后仍然存在。

**Blocked by:** 01 — 启动可安装的本地优先应用.

**Status:** ready-for-agent

- [ ] Overview 和 Subscriptions 的空状态都提供清晰的新增入口，并进入同一个新增 Subscription 流程。
- [ ] 表单支持名称、金额、Next Billing Date、固定 Category，以及可选 Plan Name 和 Payment Method Label；未选择 Category 时使用 Other。
- [ ] 金额必须大于零并按整数最小货币单位持久化，表单不允许提交空必填项、NaN、无穷值或超出支持精度的金额。
- [ ] Payment Method Label 仅接受普通显示文本，界面不索取或暗示保存完整卡号、CVV、银行登录信息或支付凭证。
- [ ] 成功保存后，用户会返回可理解的位置，并能在 Subscriptions 列表、Subscription Details 和最小 Overview 汇总中看到新记录。
- [ ] 列表项和详情显示名称、格式化金额、Monthly Billing Cycle、Category、Next Billing Date、相对倒计时及可选信息。
- [ ] 取消表单或保存失败不会留下部分记录；失败信息以用户可理解的方式显示，不暴露 SQLite 或插件堆栈。
- [ ] Subscription 使用稳定 UUID，并包含后续迁移与同步所需的创建、更新时间及版本元数据。
- [ ] 关闭并重新启动应用后，保存的 Subscription 仍可从真实本地数据库读取。
- [ ] 最高层行为测试覆盖“新增 → 列表 → 详情 → Overview → 重新初始化后仍存在”的完整路径，并另有最小验证覆盖非法金额不落库。
