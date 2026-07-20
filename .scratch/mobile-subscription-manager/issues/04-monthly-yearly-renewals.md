# 04 — 正确追踪月付与年付续费

**What to build:** 用户可以记录 Monthly 和 Yearly Billing Cycle，并始终看到正确的 Next Billing Date、相对倒计时和标准化月均成本，包括月末、闰年、跨年和已过期日期等真实边界情况。

**Blocked by:** 02 — 记录并持久化第一个月付订阅.

**Status:** ready-for-agent

- [ ] 新增流程支持 Monthly 和 Yearly Billing Cycle，列表与详情使用文字和视觉标识清楚区分二者。
- [ ] Subscription 独立保存 Billing Anchor 和 Next Billing Date，使短月份不会永久改变用户原始续费意图。
- [ ] 29、30、31 日的月付续费在短月份使用最后有效日期，并在后续允许的月份恢复原始锚点日。
- [ ] 2 月 29 日的年付续费在非闰年使用 2 月 28 日，并在闰年恢复 2 月 29 日。
- [ ] 应用启动后会把过去的 Next Billing Date 按完整 Billing Cycle 推进到今天或未来，同时保留 Billing Anchor。
- [ ] Subscription 列表默认按 Next Billing Date 从近到远排列，并同时显示精确日期与本地化相对倒计时。
- [ ] 最小 Overview 的 Normalized Monthly Recurring Cost 将 Monthly 金额全额计入、Yearly 金额按十二分之一计入，并只在显示边界舍入。
- [ ] 日期计算使用可控时钟和 date-only 领域值，不因开发机真实日期、区域或时区而波动。
- [ ] 表驱动测试覆盖普通月付、普通年付、29–31 日、跨年、2 月 29 日、长时间过期推进和设备时区变化后的日期稳定性。
