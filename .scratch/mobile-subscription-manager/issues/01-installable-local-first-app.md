# 01 — 启动可安装的本地优先应用

**What to build:** 用户可以安装并启动采用 Vibrant Scout 视觉语言的本地优先移动应用，在概览、订阅、统计和设置四个主目的地之间导航，并看到由真实空数据库驱动的初始状态。这个切片同时建立后续功能共用的最高层 UI 行为测试入口。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] 应用采用 Vue 3、TypeScript、Vite、构建时 Tailwind CSS 和 Capacitor，并可在浏览器开发模式与 Android 容器中启动。
- [ ] 首次启动会幂等执行 SQLite schema migration，并以空数据状态完成初始化，不需要网络连接或用户账号。
- [ ] 用户可以在 Overview、Subscriptions、Stats 和 Settings 四个主目的地之间导航，系统返回键和页面返回行为可预测。
- [ ] 空 Overview 和 Subscriptions 页面清楚说明尚未记录订阅；Stats 显示可信的零值状态，Settings 显示当前本地默认设置而不展示无功能的账号、Pro 或 WebDAV 控件。
- [ ] 共享视觉令牌体现 Scout Green 调色板、指定字体、8px 间距、厚底边框、最大化圆角和触感按压反馈。
- [ ] 底部导航、主要内容和操作区域适配移动设备安全区域，较大屏幕上的内容宽度受控并居中。
- [ ] 自动化验收可以通过公共 UI 启动应用、等待数据库初始化、验证空状态并完成四个目的地导航，不断言组件内部实现。
- [ ] Capacitor 项目结构保持 iOS 兼容，但本票不要求 iOS 签名或构建。
