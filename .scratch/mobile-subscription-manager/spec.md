# 构建本地优先的 SubScout 移动端订阅管理 MVP

Status: ready-for-agent
Type: spec

## Problem Statement

用户已经完成了一套手机端订阅管理应用的 Stitch 视觉原型，并掌握 Vue 和 Python，但当前交付物仍是使用 Tailwind CDN 的静态 HTML 页面，尚未形成可安装、可持久化数据、可离线工作和可发送扣费提醒的移动应用。

用户需要一个低运维、隐私友好、可以快速发布的第一版产品，用来记录月付和年付订阅、查看即将发生的扣费、理解自己的订阅支出，并在扣费前收到提醒。第一版不应因为账号体系、云同步、支付验证或自建后端而延迟核心价值交付。

## Solution

将现有六个 Stitch 页面及 Vibrant Scout 设计系统重建为 Vue 3 移动应用，并通过 Capacitor 打包为原生 Android/iOS 容器。应用采用本地优先架构：订阅、分类、设置和同步元数据保存在设备 SQLite 中；本月扣费、月均支出和分类统计在设备上计算；扣费提醒使用设备本地通知调度；导入导出使用设备文件选择与分享能力。

MVP 无需注册、登录或云端后端，完整核心流程必须离线可用。代码结构保留清晰的数据访问和通知边界，使未来可以增加 FastAPI、PostgreSQL 和托管身份认证，而无需重写页面和领域计算。

应用保留原型中的 Vibrant Scout 视觉语言，包括高对比度 Scout Green、厚底边框、最大化圆角、8px 间距网格、可按压的触感反馈和移动端安全区域适配。MVP 导航包括概览、订阅、统计和设置，并提供新增、详情和编辑流程。

## User Stories

1. As a subscription manager user, I want to open the app without creating an account, so that I can start tracking subscriptions immediately.
2. As a privacy-conscious user, I want my subscription data stored on my device by default, so that I do not have to upload financial habits to a third party.
3. As an offline user, I want all core tracking features to work without network access, so that poor connectivity does not block me.
4. As a first-time user, I want a clear empty state, so that I understand how to add my first subscription.
5. As a subscription manager user, I want to add a subscription from the overview, so that I can capture a new recurring expense quickly.
6. As a subscription manager user, I want to add a subscription from the subscription list, so that the primary action is available where I manage records.
7. As a subscription manager user, I want to enter the service name, so that I can recognize the subscription later.
8. As a subscription manager user, I want to enter the recurring amount, so that spending summaries are accurate.
9. As a subscription manager user, I want invalid or negative amounts rejected with a clear message, so that bad data is not saved.
10. As a subscription manager user, I want to choose a monthly or yearly billing cycle, so that the app can model the plans shown in the product design.
11. As a subscription manager user, I want to enter the next billing date, so that countdowns and reminders are based on a real renewal date.
12. As a subscription manager user, I want to assign a category, so that I can understand where my subscription money goes.
13. As a subscription manager user, I want an “Other” fallback category, so that categorization never blocks saving a record.
14. As a subscription manager user, I want to enter an optional plan name, so that I can distinguish tiers such as Basic and Premium.
15. As a subscription manager user, I want to enter an optional payment-method label, so that I can remember how I pay without storing full card credentials.
16. As a subscription manager user, I want required fields identified before submission, so that I can fix the form without guessing.
17. As a subscription manager user, I want to cancel an unfinished form without changing my data, so that accidental edits are harmless.
18. As a subscription manager user, I want saved subscriptions to appear immediately, so that I know the action succeeded.
19. As a subscription manager user, I want my records retained after closing or restarting the app, so that the app is a dependable source of truth.
20. As a subscription manager user, I want to see all active subscriptions in one list, so that I can review ongoing commitments.
21. As a subscription manager user, I want each list item to show name, category, amount, cycle and next billing timing, so that I can scan without opening every record.
22. As a subscription manager user, I want yearly subscriptions visually distinguished from monthly subscriptions, so that expensive annual renewals are not overlooked.
23. As a subscription manager user, I want subscriptions ordered by the next billing date by default, so that the most urgent charges appear first.
24. As a subscription manager user, I want to search subscriptions by name, so that I can find a record quickly.
25. As a subscription manager user, I want to filter subscriptions by status, category and billing cycle, so that I can focus on a useful subset.
26. As a subscription manager user, I want search and filter results to update without losing my stored data, so that exploration is safe.
27. As a subscription manager user, I want a useful no-results state, so that I can distinguish an empty filter result from a loading failure.
28. As a subscription manager user, I want to open a subscription detail view, so that I can inspect all recorded information.
29. As a subscription manager user, I want the detail view to show the exact next billing date and relative countdown, so that I understand both the calendar date and urgency.
30. As a subscription manager user, I want the detail view to show status, category, plan and payment label, so that the subscription context is complete.
31. As a subscription manager user, I want to edit a subscription, so that price, plan, category and renewal changes remain accurate.
32. As a subscription manager user, I want notification schedules updated after editing a subscription, so that stale reminders are not delivered.
33. As a subscription manager user, I want to mark a subscription cancelled, so that I can preserve its record without counting future charges.
34. As a subscription manager user, I want cancelled subscriptions excluded from upcoming payments and active spending totals, so that forecasts represent current commitments.
35. As a subscription manager user, I want to reactivate a cancelled subscription, so that resuming a service does not require rebuilding its record.
36. As a subscription manager user, I want to permanently delete a subscription after confirmation, so that mistakes can be removed without accidental data loss.
37. As a subscription manager user, I want the overview to show the number of active subscriptions, so that I can understand the size of my subscription portfolio.
38. As a subscription manager user, I want the overview to show normalized monthly recurring cost, so that monthly and yearly plans can be compared on one basis.
39. As a subscription manager user, I want to see the nearest upcoming payments on the overview, so that likely charges are visible immediately.
40. As a subscription manager user, I want a “See all” action from upcoming payments, so that I can move from the summary to the full list.
41. As a subscription manager user, I want the overview totals to refresh immediately after create, edit, cancel, reactivate or delete, so that the screen never shows stale calculations.
42. As a subscription manager user, I want to see the total amount scheduled to charge in the current calendar month, so that I can plan near-term cash flow.
43. As a subscription manager user, I want to compare this month’s scheduled charges with the previous month, so that I can see whether near-term subscription spending is rising or falling.
44. As a subscription manager user, I want a category breakdown for the selected month, so that I can identify the largest sources of subscription spending.
45. As a subscription manager user, I want category totals to reconcile with the month total, so that the statistics are trustworthy.
46. As a subscription manager user, I want yearly subscriptions included only in months when they are scheduled to charge, so that calendar-month forecasts are correct.
47. As a subscription manager user, I want yearly subscriptions divided by twelve in the normalized monthly recurring cost, so that recurring-cost comparisons remain useful.
48. As a subscription manager user, I want past renewal dates advanced to the next valid cycle when the app opens, so that upcoming-payment information remains current.
49. As a subscription manager user with a month-end renewal, I want renewals anchored correctly across short months, so that a January 31 subscription does not drift permanently to the 28th.
50. As a subscription manager user with a leap-day annual plan, I want non-leap years handled predictably, so that reminders and forecasts stay stable.
51. As a subscription manager user, I want to enable billing reminders from settings, so that the app requests notification permission only when I choose the feature.
52. As a subscription manager user, I want to choose how many days before billing I am reminded, so that reminders match my planning habits.
53. As a subscription manager user, I want a sensible default reminder lead time, so that setup is quick.
54. As a subscription manager user, I want reminders delivered using the device’s local time, so that they arrive at an understandable hour.
55. As an offline user, I want scheduled reminders to work without a server connection, so that network outages do not suppress warnings.
56. As a subscription manager user, I want cancelled or deleted subscriptions to have pending reminders removed, so that I do not receive misleading alerts.
57. As a subscription manager user, I want notification schedules reconciled when the app opens or relevant data changes, so that OS schedules follow current records.
58. As a subscription manager user who denied notification permission, I want the app to explain how to enable it later, so that I can recover without reinstalling.
59. As a subscription manager user, I want to use light or dark appearance, so that the interface is comfortable in different environments.
60. As a subscription manager user, I want my appearance choice remembered, so that I do not have to reset it after every launch.
61. As a subscription manager user, I want to select English or Chinese, so that I can use the app in my preferred language.
62. As a subscription manager user, I want all navigation labels, forms, validation messages and notifications translated consistently, so that mixed-language screens do not cause confusion.
63. As a subscription manager user, I want to select one app-wide currency, so that amounts and totals have a consistent meaning.
64. As a subscription manager user, I want a clear warning before changing the currency of existing records without conversion, so that relabelling amounts cannot happen silently.
65. As a subscription manager user, I want my language, currency, appearance and reminder preferences persisted locally, so that settings survive restarts.
66. As a subscription manager user, I want to export a complete local backup, so that I can protect myself against device loss or migration.
67. As a subscription manager user, I want to import a previously exported backup, so that I can restore my records on another installation.
68. As a subscription manager user, I want import to validate the backup before changing current data, so that malformed files cannot corrupt my records.
69. As a subscription manager user, I want explicit confirmation before an import replaces current data, so that restoration cannot erase data accidentally.
70. As a subscription manager user, I want a failed import to leave current data untouched, so that recovery attempts are atomic.
71. As a subscription manager user, I want the app to explain that exported files contain sensitive subscription information, so that I can store or share them safely.
72. As a mobile user, I want bottom navigation and primary actions to respect device safe areas, so that controls are not obscured by system UI.
73. As a mobile user, I want touch targets large enough for comfortable one-handed use, so that the app is easy to operate.
74. As a mobile user, I want tactile press feedback matching the prototype, so that actions feel responsive and intentional.
75. As a mobile user, I want clear loading, success and error feedback for operations that are not instantaneous, so that I always know the app’s state.
76. As an accessibility user, I want readable contrast, semantic labels and screen-reader names, so that core workflows are perceivable and operable.
77. As an accessibility user, I want the app to respect reduced-motion preferences, so that tactile animations do not cause discomfort.
78. As a mobile user, I want predictable back navigation from forms and details, so that I do not lose my place unexpectedly.
79. As a user on a larger phone or tablet, I want content width constrained and centered, so that the interface remains readable rather than stretching awkwardly.
80. As a returning user after an app upgrade, I want existing local data migrated safely, so that releases do not erase or reinterpret my subscriptions.

## Implementation Decisions

- **Product scope:** This specification covers the local-first MVP. It delivers subscription lifecycle management, overview, statistics, local reminders, preferences, bilingual UI and local backup/restore. Cloud accounts and commercial features are deferred.
- **Client stack:** Build with Vue 3, TypeScript and Vite. Use Vue Router for navigation, Pinia for cross-screen UI/session state, Tailwind CSS at build time for styling, and Capacitor as the native container. Do not use the Tailwind CDN in production.
- **Native packaging:** Android is the first locally verifiable target. The application architecture and Capacitor configuration must remain compatible with iOS, but iOS signing and store submission are not required for this MVP.
- **Design system:** Treat the supplied Vibrant Scout prototype as the visual source of truth. Preserve its Scout Green-led palette, Plus Jakarta Sans headings, Be Vietnam Pro body text, 8px spacing grid, heavy structural borders, maximal rounding, pill badges, chunky progress bars and pressed-state translation. Repeated values must be represented as shared design tokens rather than copied page by page.
- **Navigation:** Provide four top-level destinations: Overview, Subscriptions, Stats and Settings. Provide subordinate routes for creating, viewing and editing a subscription. The prototype’s Curated tab is replaced by Overview because no separate curated-content design or behavior exists.
- **Local-first persistence:** Store domain data in SQLite on the device. Core reads and writes must not require network access. Use schema migrations from the first release so future application upgrades can preserve user data.
- **Application seams:** UI screens call application-level subscription operations rather than issuing SQL or native plugin calls directly. A single subscription data module owns persistence operations; a notification adapter owns Capacitor scheduling; an import/export module owns backup serialization. Avoid speculative factories or multiple repository implementations in the MVP.
- **Subscription schema:** A Subscription has a stable UUID, name, amount in minor units, ISO currency code, billing interval, billing anchor, next billing date, category, optional plan name, optional payment-method label, active/cancelled status, reminder eligibility, creation time, update time, deletion marker and synchronization version metadata.
- **Billing intervals:** MVP supports monthly and yearly intervals only. Custom day/week/quarter intervals are not represented in forms or calculations.
- **Money representation:** Persist amounts as integer minor units, never binary floating-point values. Formatting converts minor units to localized display values at the UI boundary.
- **Currency model:** MVP uses one configured currency across all subscriptions and does not perform foreign-exchange conversion. Changing currency while records exist requires an explicit warning that existing numeric values will be reinterpreted, not converted.
- **Billing anchors:** Preserve the user’s original month-day intent independently from the current next billing date. Monthly renewals anchored to days 29–31 use the last valid day in short months but return to the anchor day in later months. A February 29 yearly renewal uses February 28 in non-leap years and returns to February 29 in leap years.
- **Overdue advancement:** On startup and after import, advance a past next billing date by complete billing intervals until it is current or future. Advancement must preserve the original billing anchor.
- **Active state:** Cancelled subscriptions remain viewable and editable but do not appear in upcoming payments, active counts, future forecasts or notification schedules. Reactivation recalculates the next valid billing date and reinstates eligible reminders.
- **Deletion:** Permanent deletion requires confirmation. A deletion marker and version metadata are retained as needed for future synchronization compatibility; user-facing lists treat deleted records as absent.
- **Categories:** Ship a small fixed set matching the prototype’s needs, including Entertainment, Music, Productivity, Utilities, Health and Other. Custom categories are deferred with Pro/cloud work.
- **Payment method safety:** The optional payment-method value is a user-entered display label only. Do not request or persist a full card number, CVV, bank login or payment-provider credential.
- **Overview semantics:** Active count includes active, non-deleted subscriptions. Normalized monthly recurring cost equals monthly amounts plus one-twelfth of yearly amounts, rounded only for display. Upcoming payments are active subscriptions ordered by next billing date, with the nearest items displayed first.
- **Statistics semantics:** “Scheduled this month” is the sum of billing occurrences whose next/derived charge date falls within the selected calendar month. The previous-month comparison uses the same rule. Category breakdown uses the same month and basis as the hero total so category values reconcile to the total.
- **Search and filtering:** Search is case-insensitive by subscription name. Filters cover status, category and billing interval. Filters affect presentation only and do not mutate saved records.
- **Notification permissions:** Do not request notification permission on first launch. Request it when the user enables reminders. If permission is denied, retain the preference state needed to explain recovery but do not pretend reminders are scheduled.
- **Notification scheduling:** Use Capacitor local notifications, not server push. Default to three days before billing at 09:00 device-local time. Reconcile pending notifications on app startup and after create, edit, cancel, reactivate, delete, import or reminder-setting changes. Keep a rolling schedule for future occurrences sufficient to cover at least the next twelve months, subject to platform scheduling limits.
- **Time zones:** Billing dates are date-only domain values. Notification instants are derived from those dates using the current device time zone. A time-zone change must not change the intended billing date.
- **State management:** Pinia stores shared UI state and current preferences. SQLite remains the durable source of truth for subscriptions; Pinia must not become an independent second database.
- **Localization:** Provide complete English and Simplified Chinese message catalogs, including validation and notification text. Persist the selected language locally and fall back to English for missing development-time keys.
- **Theme:** Support light and dark themes using shared semantic tokens. Respect the device reduced-motion preference by disabling nonessential bouncing, lifting and large transitions.
- **Backup contract:** Export one versioned JSON document containing subscriptions, categories, preferences and schema metadata. The export must not contain OS notification identifiers that are invalid on another device.
- **Restore contract:** Validate document type, schema version and all required field constraints before mutation. MVP restore uses replace semantics, requires confirmation, applies atomically, advances overdue billing dates and rebuilds notification schedules. Merge/conflict resolution is deferred.
- **Error handling:** Validation and recoverable errors must be displayed in user language without exposing raw SQL, native plugin stack traces or internal identifiers. Failed writes and imports leave the prior durable state intact.
- **Accessibility:** Use semantic controls, visible focus states, screen-reader labels, minimum practical mobile touch targets and at least WCAG AA text contrast. Color must not be the only indication of status or urgency.
- **Future backend boundary:** No HTTP API is part of the MVP. A future cloud phase may add FastAPI, PostgreSQL, SQLAlchemy, Alembic and managed authentication. The future sync layer should operate through application data operations rather than changing view contracts.
- **Future authentication:** Do not ship placeholder login, logout, personal-information or security controls in the MVP. When cloud sync exists, prefer a managed identity provider and validate its tokens in FastAPI rather than implementing password security from scratch.
- **Future commercial boundary:** Do not ship nonfunctional Pro controls. Future in-app purchases should use Apple/Google store billing with a service such as RevenueCat for cross-platform entitlement handling and server-side purchase validation.

## Testing Decisions

- Good tests assert externally visible behavior and domain outcomes, not component internals, SQL statements, CSS class strings or private helper calls.
- The primary and highest test seam is one UI-level subscription lifecycle flow using the real application operations and a test SQLite database: create a subscription, observe it on Overview and Subscriptions, verify Details and Stats, edit it, verify reminder reconciliation, cancel it, and confirm all derived views and reminders update. This is the main acceptance seam and should cover the largest amount of behavior with the fewest test-specific boundaries.
- Time-dependent tests use a controllable clock. Tests must not depend on the developer machine’s real date, locale or time zone.
- The notification boundary uses a thin fake/spy adapter in automated tests while preserving the same inputs sent to Capacitor. Assert the set of intended notifications and their user-visible dates, not plugin implementation calls beyond this public adapter contract.
- Recurrence behavior receives focused table-driven tests for ordinary monthly renewals, days 29–31, year boundaries, February 29, overdue advancement and time-zone changes. These tests verify resulting billing dates.
- Money and statistics behavior receives focused tests for integer-minor-unit calculations, yearly-to-monthly normalization, current-month occurrence totals, previous-month comparisons, category reconciliation, cancelled records and display rounding.
- Persistence behavior is tested through application operations against a temporary migrated SQLite database. Verify data survives repository reinitialization and that a failed transaction does not partially mutate state.
- Import/export behavior is tested as a round trip through the public backup operations. Cover a valid restore, unsupported schema version, malformed fields, atomic failure, explicit replace confirmation and reminder rebuilding.
- Search and filter tests operate through the rendered subscription list and assert visible results and empty states rather than Pinia state shape.
- Localization tests exercise representative complete user flows in English and Simplified Chinese and fail on missing production message keys.
- Accessibility checks cover semantic names, keyboard/focus behavior in web mode, contrast, reduced motion and mobile touch-target sizing. Manual screen-reader smoke checks are required on the first Android release candidate.
- Visual acceptance compares the implemented Overview, Subscriptions, Details, Add/Edit, Stats and Settings screens with the supplied Stitch references at representative mobile widths, including pressed states, bottom safe area and dark mode. Pixel identity is not required; design tokens, hierarchy, spacing and interaction character are.
- Native acceptance on an Android emulator or device covers application install, SQLite persistence across process death, notification permission grant/deny flows, local notification delivery, file export and file import.
- There is no existing test prior art in the current workspace because it contains no application code. The implementation should establish the single high-level lifecycle seam first, then add only the focused date, money, persistence and backup tests needed to protect nontrivial behavior.

## Out of Scope

- User registration, login, logout, password reset, personal-information management and account security screens.
- FastAPI services, PostgreSQL, cloud deployment, REST endpoints and multi-device cloud synchronization.
- WebDAV synchronization, WebDAV credential storage and sync conflict resolution.
- Curated subscription recommendations or a separate Curated content feed.
- Streaks, levels, mascots as a progression system, rewards and other gamification logic. Decorative visual elements may remain where they do not imply nonexistent functionality.
- SubScout Pro entitlements, tracker limits, custom categories, advanced analytics and feature gating.
- Apple App Store or Google Play billing, purchase restoration, receipt validation and subscription entitlement services.
- Foreign-exchange rates, automatic currency conversion and totals that combine multiple currencies.
- Weekly, quarterly, arbitrary-day or other custom billing intervals.
- Automatic discovery from bank transactions, emails, receipts or device-installed applications.
- Executing payments, cancelling a real provider subscription or connecting to card/bank accounts.
- Remote push notifications, background server jobs, Redis, message queues, microservices or Kubernetes.
- Backup merge semantics, collaborative/family accounts and concurrent edit conflict resolution.
- Production iOS signing, App Store submission and macOS build infrastructure in the Windows-based MVP workflow.
- A desktop-first web product or separate administration console.

## Further Notes

- The supplied Stitch output is a design reference, not production application code. Its inline Tailwind configuration and duplicated page markup should be translated into reusable Vue components and shared semantic design tokens.
- Use these domain terms consistently: **Subscription** is one recurring service commitment; **Billing Cycle** is monthly or yearly recurrence; **Billing Anchor** preserves the user’s intended renewal day; **Next Billing Date** is the next valid occurrence; **Normalized Monthly Recurring Cost** compares recurring commitments; **Scheduled This Month** totals actual occurrences in a calendar month.
- The chosen test seam is the complete UI-driven subscription lifecycle backed by real local persistence and a controllable notification boundary. This reflects the user’s core outcome more faithfully than testing each component in isolation.
- Development on Windows can build and verify Android locally. A later iOS release requires macOS/Xcode or a compatible hosted macOS build service.
- When cloud synchronization becomes a real requirement, the recommended backend remains FastAPI with PostgreSQL, SQLAlchemy and Alembic, with managed authentication and a deliberately small sync contract. That phase should be specified separately rather than expanding this MVP issue.
