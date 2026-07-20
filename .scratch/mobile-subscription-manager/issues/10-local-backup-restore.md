# 10 — 导出并恢复本地备份

**What to build:** 用户可以把本地 Subscription 和 Preferences 导出为可迁移的版本化备份，并在另一安装中经过验证与确认后原子恢复；失败的恢复不会损坏当前数据，成功恢复会重建所有派生日期和提醒。

**Blocked by:** 09 — 接收本地扣费提醒.

**Status:** ready-for-agent

- [ ] Settings 提供导出操作，通过设备文件/分享能力生成一个版本化 JSON 文档，包含 Subscription、固定 Category、Preferences 和 schema metadata。
- [ ] 导出不包含设备专属通知标识、系统权限状态、完整支付凭证或其他无法在另一设备复用的运行时数据。
- [ ] 导出前明确提醒用户备份包含敏感的订阅消费信息，需要安全保存和分享。
- [ ] 导入操作在任何持久化修改前验证文档类型、schema version、必填字段、整数金额、Currency、Billing Cycle、日期和状态约束。
- [ ] 有效导入采用 replace semantics，并在替换现有数据前要求明确确认；取消确认保持现有数据与提醒不变。
- [ ] 恢复在单一原子事务中完成；任何解析、验证或写入失败都会回滚，用户现有数据保持可读且不发生部分替换。
- [ ] 成功恢复后推进所有过期 Next Billing Date，同时保留 Billing Anchor，并使用恢复后的 Language、Currency 和提醒设置重建本地通知。
- [ ] 不支持的备份版本或损坏文件显示本地化、可操作的错误，不暴露 SQL、文件系统或插件堆栈。
- [ ] 自动化 round-trip 测试验证导出后恢复得到等价用户数据，并覆盖坏文件、未知版本、非法字段、取消确认、原子失败和提醒重建。
- [ ] Android smoke check 验证系统文件选择、文件写出、文件读入和用户取消系统选择器时的安全行为。
