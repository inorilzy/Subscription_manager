# 08 — 分析本月计划扣费

**What to build:** 用户可以在 Stats 中查看当前日历月计划发生的 Subscription 扣费总额、与上月的变化和可核对的 Category Breakdown，从而区分实际月度现金流与标准化月均成本。

**Blocked by:** 05 — 管理订阅完整生命周期.

**Status:** done

- [x] Stats hero 显示 Scheduled This Month，即当前日历月内实际 Billing Occurrence 的整数金额总和。
- [x] 页面显示与上一个日历月使用同一规则计算的金额差异，并正确表达增加、减少或持平。
- [x] Category Breakdown 使用与 hero 相同的月份和 occurrence 基础，所有 Category 金额之和与 hero 总额完全一致。
- [x] Yearly Subscription 只在其实际计划扣费月份计入 Scheduled This Month，而不是每月除以十二。
- [x] Cancelled 和 deleted Subscription 不进入当前月、上月或 Category 统计。
- [x] 无计划扣费时显示可信零值和空分类状态，不把无数据呈现为错误。
- [x] 所有金额使用整数最小货币单位计算并通过共享 Currency 格式器显示，不使用二进制浮点累加。
- [x] 页面清楚区分 Scheduled This Month 与 Overview 的 Normalized Monthly Recurring Cost，避免用户把现金流预测误认为月均指标。
- [x] 统计界面符合 supplied Stats reference 的主金额层级、Category 条形图、Vibrant Scout 触感和移动端布局，并支持中英文及深浅主题。
- [x] 可控时钟测试覆盖月初/月末、跨年、Yearly occurrence、Cancelled 记录、上月差额、Category 对账和显示舍入。
