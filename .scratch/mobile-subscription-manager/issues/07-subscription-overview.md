# 07 — 查看订阅组合概览

**What to build:** 用户可以在 Overview 一眼看到有效 Subscription 数量、Normalized Monthly Recurring Cost 和最近即将发生的扣费，并能从摘要直接进入新增、详情或完整列表流程。

**Blocked by:** 05 — 管理订阅完整生命周期.

**Status:** done

- [x] Overview 显示 Active、非删除 Subscription 数量，并排除 Cancelled 记录。
- [x] Normalized Monthly Recurring Cost 使用整数金额计算 Monthly 全额加 Yearly 十二分之一，仅在显示时舍入。
- [x] Upcoming Payments 按 Next Billing Date 显示最近项目，每项包含名称、格式化金额、Billing Cycle、精确日期或本地化倒计时以及不可仅靠颜色识别的紧迫状态。
- [x] Upcoming Payments 只包含 Active、非删除记录，并对无即将扣费项显示明确空状态。
- [x] “See all”进入完整 Subscriptions 列表；点击即将扣费项进入对应 Subscription Details；主要新增操作进入统一新增流程。
- [x] 创建、编辑、取消、重新启用和删除完成后，Overview 在返回时立即显示最新数据而无需应用重启。
- [x] 页面在英文、简体中文、浅色、深色、减少动态效果和常见手机安全区域下保持完整可用。
- [x] 视觉实现与 supplied Overview reference 的信息层级、卡片、徽标、进度表现和触感操作一致，但不保留无实际功能的 streak/level 控件。
- [x] UI 行为测试以真实测试数据库验证不同 Monthly/Yearly/Cancelled 组合下的数量、月均成本、排序、导航和实时刷新。
