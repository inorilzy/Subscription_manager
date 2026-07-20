# 11 — 交付可验证的 Android 候选版本

**What to build:** 用户获得一个可安装、可离线使用且完整体现 supplied Stitch 设计的 Android MVP 候选版本；核心 Subscription 生命周期、统计、提醒、偏好和备份在真实设备条件下共同工作，并具备可重复的验收证据。

**Blocked by:** 06 — 搜索和筛选订阅; 07 — 查看订阅组合概览; 08 — 分析本月计划扣费; 10 — 导出并恢复本地备份.

**Status:** partial — web build + cap sync done; Android APK blocked on missing JAVA_HOME

- [ ] 生成可安装的 Android 候选构建，并在干净安装、升级安装、离线启动和进程被系统终止后重新启动的场景中正常运行。
- [ ] 最高层生命周期验收完成“新增 → Overview/Subscriptions/Details/Stats → 编辑 → 提醒重排 → 取消 → 重新启用 → 删除”，使用真实迁移后的 SQLite 和可控通知边界。
- [ ] 真实 Android 设备或模拟器验证 SQLite 跨进程持久化、通知权限允许/拒绝、离线本地通知投递、文件导出和文件恢复。
- [ ] Overview、Subscriptions、Details、Add/Edit、Stats 和 Settings 与 supplied Stitch references 在代表性手机宽度下保持一致的信息层级、间距、形状、颜色和触感反馈。
- [ ] Light/Dark、English/简体中文、Currency、更改确认、减少动态效果和大屏内容约束均通过完整流程检查。
- [ ] 底部导航、固定操作、键盘弹出后的表单和系统手势区域均遵守安全区域，不遮挡主要内容或提交操作。
- [ ] 自动无障碍检查覆盖语义名称、焦点可见性、对比度和触摸目标；首个候选版本完成 Android 屏幕阅读器手工 smoke check。
- [ ] 任何加载、验证、权限、数据库、通知或文件错误都有本地化用户反馈，不出现空白屏、原始堆栈或静默数据丢失。
- [ ] 应用不包含可点击但无功能的 Account、Security、Logout、WebDAV、Curated、Streak、Level 或 SubScout Pro 控件。
- [ ] 所有自动化测试和生产构建检查通过，并记录候选版本已知限制；iOS 兼容配置保留，但本票不要求 iOS 签名或 App Store 提交。
