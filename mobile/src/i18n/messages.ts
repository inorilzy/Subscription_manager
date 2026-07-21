export type MessageKey =
  | 'nav.overview'
  | 'nav.subscriptions'
  | 'nav.stats'
  | 'nav.settings'
  | 'app.starting'
  | 'app.bootError'
  | 'overview.greeting'
  | 'overview.title'
  | 'overview.squad'
  | 'overview.active'
  | 'overview.monthly'
  | 'overview.empty'
  | 'overview.upcoming'
  | 'subscriptions.title'
  | 'subscriptions.subtitle'
  | 'subscriptions.emptyTitle'
  | 'subscriptions.emptyBody'
  | 'subscriptions.add'
  | 'subscriptions.addLong'
  | 'create.title'
  | 'create.subtitle'
  | 'create.name'
  | 'create.amount'
  | 'create.nextBillingDate'
  | 'create.category'
  | 'create.categoryDefault'
  | 'create.newCategory'
  | 'create.newCategoryPlaceholder'
  | 'create.newCategoryAdd'
  | 'common.perDay'
  | 'common.daysLeft'
  | 'create.planName'
  | 'create.paymentMethod'
  | 'create.paymentHint'
  | 'create.optional'
  | 'create.cancel'
  | 'create.save'
  | 'create.saving'
  | 'create.billingCycle'
  | 'create.monthly'
  | 'create.yearly'
  | 'detail.title'
  | 'detail.back'
  | 'detail.amount'
  | 'detail.cycle'
  | 'detail.nextBillingDate'
  | 'detail.countdown'
  | 'detail.plan'
  | 'detail.payment'
  | 'detail.status'
  | 'detail.active'
  | 'detail.cancelled'
  | 'detail.notFound'
  | 'detail.loadError'
  | 'detail.edit'
  | 'detail.cancelSub'
  | 'detail.reactivate'
  | 'detail.delete'
  | 'detail.deleteConfirmTitle'
  | 'detail.deleteConfirmBody'
  | 'detail.deleteConfirm'
  | 'detail.deleteCancel'
  | 'edit.title'
  | 'edit.subtitle'
  | 'stats.title'
  | 'stats.scheduled'
  | 'stats.zeroBody'
  | 'stats.categories'
  | 'stats.categoriesEmpty'
  | 'settings.title'
  | 'settings.appearance'
  | 'settings.currency'
  | 'settings.language'
  | 'settings.footer'
  | 'settings.webdav'
  | 'settings.webdavUrl'
  | 'settings.webdavUsername'
  | 'settings.webdavPassword'
  | 'settings.webdavPath'
  | 'settings.webdavEnabled'
  | 'settings.webdavTest'
  | 'settings.webdavUpload'
  | 'settings.webdavDownload'
  | 'settings.webdavSave'
  | 'settings.webdavHint'
  | 'settings.webdavTestOk'
  | 'settings.webdavUploadOk'
  | 'settings.webdavDownloadConfirm'
  | 'settings.light'
  | 'settings.dark'
  | 'settings.english'
  | 'settings.chinese'
  | 'settings.currencyWarningTitle'
  | 'settings.currencyWarningBody'
  | 'settings.currencyConfirm'
  | 'settings.currencyCancel'
  | 'common.today'
  | 'common.inOneDay'
  | 'common.inDays'
  | 'common.oneDayAgo'
  | 'common.daysAgo'
  | 'common.monthly'
  | 'common.yearly'
  | 'error.nameRequired'
  | 'error.dateRequired'
  | 'error.dateInvalid'
  | 'error.amountRequired'
  | 'error.amountInvalid'
  | 'error.amountTooLarge'
  | 'error.amountPositive'
  | 'error.paymentSensitive'
  | 'error.saveFailed'
  | 'error.missingKey'

export type LanguageCode = 'en' | 'zh-CN'
export type ThemeMode = 'light' | 'dark'
export type CurrencyCode = 'USD' | 'CNY' | 'EUR' | 'GBP' | 'JPY'

export const SUPPORTED_CURRENCIES: CurrencyCode[] = ['USD', 'CNY', 'EUR', 'GBP', 'JPY']

const en: Record<MessageKey, string> = {
  'nav.overview': 'Overview',
  'nav.subscriptions': 'Subscriptions',
  'nav.stats': 'Stats',
  'nav.settings': 'Settings',
  'app.starting': 'Starting SubScout…',
  'app.bootError': 'Failed to start local database',
  'overview.greeting': 'Hi, Saver!',
  'overview.title': 'Overview',
  'overview.squad': 'Your Sub Squad',
  'overview.active': 'Active',
  'overview.monthly': 'Monthly',
  'overview.empty':
    'No subscriptions yet. Track your first recurring expense to start your Sub Squad.',
  'overview.upcoming': 'Upcoming payments',
  'subscriptions.title': 'Subscriptions',
  'subscriptions.subtitle': 'All tracked recurring services',
  'subscriptions.emptyTitle': 'No subscriptions yet',
  'subscriptions.emptyBody': 'Track your first subscription to see it here.',
  'subscriptions.add': 'Add',
  'subscriptions.addLong': 'Add subscription',
  'create.title': 'Add Subscription',
  'create.subtitle': 'Track a recurring service.',
  'create.name': 'Name',
  'create.amount': 'Amount',
  'create.nextBillingDate': 'Next Billing Date',
  'create.category': 'Category',
  'create.categoryDefault': 'Other (default)',
  'create.newCategory': 'New category',
  'create.newCategoryPlaceholder': 'e.g. Education',
  'create.newCategoryAdd': 'Add category',
  'create.planName': 'Plan Name',
  'create.paymentMethod': 'Payment Method Label',
  'create.paymentHint':
    'Display label only. Do not enter full card numbers, CVV, or bank logins.',
  'create.optional': '(optional)',
  'create.cancel': 'Cancel',
  'create.save': 'Save',
  'create.saving': 'Saving…',
  'create.billingCycle': 'Billing Cycle',
  'create.monthly': 'Monthly',
  'create.yearly': 'Yearly',
  'detail.title': 'Details',
  'detail.back': 'Back',
  'detail.amount': 'Amount',
  'detail.cycle': 'Cycle',
  'detail.nextBillingDate': 'Next Billing Date',
  'detail.countdown': 'Countdown',
  'detail.plan': 'Plan',
  'detail.payment': 'Payment',
  'detail.status': 'Status',
  'detail.active': 'Active',
  'detail.cancelled': 'Cancelled',
  'detail.notFound': 'Subscription not found.',
  'detail.loadError': 'Could not load this subscription.',
  'detail.edit': 'Edit',
  'detail.cancelSub': 'Mark cancelled',
  'detail.reactivate': 'Reactivate',
  'detail.delete': 'Delete permanently',
  'detail.deleteConfirmTitle': 'Delete subscription?',
  'detail.deleteConfirmBody':
    'This permanently removes the subscription from your device. This cannot be undone.',
  'detail.deleteConfirm': 'Delete',
  'detail.deleteCancel': 'Keep',
  'edit.title': 'Edit Subscription',
  'edit.subtitle': 'Update this recurring service.',
  'stats.title': 'Your Stats',
  'stats.scheduled': 'Scheduled this month',
  'stats.zeroBody': 'No charges planned for this calendar month yet.',
  'stats.categories': 'Category Breakdown',
  'stats.categoriesEmpty': 'Categories will appear after you track subscriptions.',
  'settings.title': 'Settings',
  'settings.appearance': 'Appearance',
  'settings.currency': 'Currency',
  'settings.language': 'Language',
  'settings.footer':
    'Local preferences only. Cloud accounts and paid upgrades are not part of this MVP.',
  'settings.webdav': 'WebDAV sync',
  'settings.webdavUrl': 'Server URL',
  'settings.webdavUsername': 'Username',
  'settings.webdavPassword': 'Password',
  'settings.webdavPath': 'Remote file path',
  'settings.webdavEnabled': 'Remember and enable WebDAV',
  'settings.webdavTest': 'Test connection',
  'settings.webdavUpload': 'Upload backup',
  'settings.webdavDownload': 'Download & restore',
  'settings.webdavSave': 'Save WebDAV settings',
  'settings.webdavHint':
    'Connects directly to your own WebDAV server. Credentials stay on this device; there is no SubScout cloud backend.',
  'settings.webdavTestOk': 'Connection successful.',
  'settings.webdavUploadOk': 'Backup uploaded to WebDAV.',
  'settings.webdavDownloadConfirm':
    'Download will replace all local subscriptions and preferences with the remote backup.',
  'settings.light': 'Light',
  'settings.dark': 'Dark',
  'settings.english': 'English',
  'settings.chinese': '简体中文',
  'settings.currencyWarningTitle': 'Change currency?',
  'settings.currencyWarningBody':
    'Existing amounts will not be converted by exchange rates. They will only be reinterpreted under the new currency label.',
  'settings.currencyConfirm': 'Change currency',
  'settings.currencyCancel': 'Cancel',
  'common.today': 'Today',
  'common.inOneDay': 'In 1 day',
  'common.inDays': 'In {n} days',
  'common.oneDayAgo': '1 day ago',
  'common.daysAgo': '{n} days ago',
  'common.monthly': 'Monthly',
  'common.yearly': 'Yearly',
  'common.perDay': '{amount}/day',
  'common.daysLeft': '{n} days left',
  'error.nameRequired': 'Name is required.',
  'error.dateRequired': 'Next billing date is required.',
  'error.dateInvalid': 'Next billing date must be a valid date.',
  'error.amountRequired': 'Amount is required.',
  'error.amountInvalid':
    'Enter a valid amount greater than zero with up to two decimal places.',
  'error.amountTooLarge': 'Amount is too large.',
  'error.amountPositive': 'Amount must be greater than zero.',
  'error.paymentSensitive':
    'Use a short label like “Visa ending 4242”. Do not enter full card numbers or CVV.',
  'error.saveFailed': 'Could not save the subscription. Please try again.',
  'error.missingKey': 'Missing translation',
}

const zh: Record<MessageKey, string> = {
  'nav.overview': '概览',
  'nav.subscriptions': '订阅',
  'nav.stats': '统计',
  'nav.settings': '设置',
  'app.starting': '正在启动 SubScout…',
  'app.bootError': '本地数据库启动失败',
  'overview.greeting': '你好，理财达人！',
  'overview.title': '概览',
  'overview.squad': '你的订阅小队',
  'overview.active': '有效',
  'overview.monthly': '月均',
  'overview.empty': '还没有订阅。记录第一笔周期支出，开始组建你的订阅小队。',
  'overview.upcoming': '即将扣费',
  'subscriptions.title': '订阅',
  'subscriptions.subtitle': '全部已记录的周期服务',
  'subscriptions.emptyTitle': '还没有订阅',
  'subscriptions.emptyBody': '记录第一个订阅后会显示在这里。',
  'subscriptions.add': '新增',
  'subscriptions.addLong': '新增订阅',
  'create.title': '新增订阅',
  'create.subtitle': '记录一项周期服务。',
  'create.name': '名称',
  'create.amount': '金额',
  'create.nextBillingDate': '下次扣费日期',
  'create.category': '分类',
  'create.categoryDefault': '其他（默认）',
  'create.newCategory': '新建分类',
  'create.newCategoryPlaceholder': '例如：教育',
  'create.newCategoryAdd': '添加分类',
  'create.planName': '套餐名称',
  'create.paymentMethod': '支付方式标签',
  'create.paymentHint': '仅用于显示。请勿输入完整卡号、CVV 或银行登录信息。',
  'create.optional': '（可选）',
  'create.cancel': '取消',
  'create.save': '保存',
  'create.saving': '保存中…',
  'create.billingCycle': '扣费周期',
  'create.monthly': '月付',
  'create.yearly': '年付',
  'detail.title': '详情',
  'detail.back': '返回',
  'detail.amount': '金额',
  'detail.cycle': '周期',
  'detail.nextBillingDate': '下次扣费日期',
  'detail.countdown': '倒计时',
  'detail.plan': '套餐',
  'detail.payment': '支付',
  'detail.status': '状态',
  'detail.active': '有效',
  'detail.cancelled': '已取消',
  'detail.notFound': '未找到该订阅。',
  'detail.loadError': '无法加载该订阅。',
  'detail.edit': '编辑',
  'detail.cancelSub': '标记为已取消',
  'detail.reactivate': '重新启用',
  'detail.delete': '永久删除',
  'detail.deleteConfirmTitle': '删除订阅？',
  'detail.deleteConfirmBody': '这将从本设备永久移除该订阅，且无法撤销。',
  'detail.deleteConfirm': '删除',
  'detail.deleteCancel': '保留',
  'edit.title': '编辑订阅',
  'edit.subtitle': '更新这项周期服务。',
  'stats.title': '你的统计',
  'stats.scheduled': '本月计划扣费',
  'stats.zeroBody': '本日历月暂无计划扣费。',
  'stats.categories': '分类明细',
  'stats.categoriesEmpty': '记录订阅后会显示分类明细。',
  'settings.title': '设置',
  'settings.appearance': '外观',
  'settings.currency': '货币',
  'settings.language': '语言',
  'settings.footer': '仅本地偏好设置。云账号与付费升级不在本 MVP 范围内。',
  'settings.webdav': 'WebDAV 同步',
  'settings.webdavUrl': '服务器地址',
  'settings.webdavUsername': '用户名',
  'settings.webdavPassword': '密码',
  'settings.webdavPath': '远程文件路径',
  'settings.webdavEnabled': '记住并启用 WebDAV',
  'settings.webdavTest': '测试连接',
  'settings.webdavUpload': '上传备份',
  'settings.webdavDownload': '下载并恢复',
  'settings.webdavSave': '保存 WebDAV 设置',
  'settings.webdavHint':
    '直接连接你自己的 WebDAV 服务器。凭证只保存在本机，没有 SubScout 云后端。',
  'settings.webdavTestOk': '连接成功。',
  'settings.webdavUploadOk': '备份已上传到 WebDAV。',
  'settings.webdavDownloadConfirm': '下载将用远程备份完整替换本机订阅和偏好设置。',
  'settings.light': '浅色',
  'settings.dark': '深色',
  'settings.english': 'English',
  'settings.chinese': '简体中文',
  'settings.currencyWarningTitle': '更改货币？',
  'settings.currencyWarningBody':
    '现有金额不会按汇率换算，只会在新货币标签下重新解释数值。',
  'settings.currencyConfirm': '更改货币',
  'settings.currencyCancel': '取消',
  'common.today': '今天',
  'common.inOneDay': '1 天后',
  'common.inDays': '{n} 天后',
  'common.oneDayAgo': '1 天前',
  'common.daysAgo': '{n} 天前',
  'common.monthly': '月付',
  'common.yearly': '年付',
  'common.perDay': '每天 {amount}',
  'common.daysLeft': '还剩 {n} 天',
  'error.nameRequired': '请填写名称。',
  'error.dateRequired': '请填写下次扣费日期。',
  'error.dateInvalid': '下次扣费日期必须是有效日期。',
  'error.amountRequired': '请填写金额。',
  'error.amountInvalid': '请输入大于零且最多两位小数的有效金额。',
  'error.amountTooLarge': '金额过大。',
  'error.amountPositive': '金额必须大于零。',
  'error.paymentSensitive':
    '请使用简短标签，例如“Visa 尾号 4242”。不要输入完整卡号或 CVV。',
  'error.saveFailed': '无法保存订阅，请重试。',
  'error.missingKey': '缺少翻译',
}

const catalogs: Record<LanguageCode, Record<MessageKey, string>> = {
  en,
  'zh-CN': zh,
}

export function isLanguageCode(value: string): value is LanguageCode {
  return value === 'en' || value === 'zh-CN'
}

export function isThemeMode(value: string): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as string[]).includes(value)
}

export function translate(
  language: LanguageCode,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const catalog = catalogs[language] ?? catalogs.en
  let text = catalog[key] ?? catalogs.en[key]
  if (!text) {
    if (import.meta.env.MODE !== 'development') {
      throw new Error(`Missing translation key: ${key}`)
    }
    text = catalogs.en[key] ?? key
  }
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}

export function localeForLanguage(language: LanguageCode): string {
  return language === 'zh-CN' ? 'zh-CN' : 'en-US'
}

/** Assert production catalogs contain every key (used by tests). */
export function assertCatalogComplete(): void {
  const keys = Object.keys(en) as MessageKey[]
  for (const lang of Object.keys(catalogs) as LanguageCode[]) {
    for (const key of keys) {
      if (!catalogs[lang][key]) {
        throw new Error(`Missing ${lang} translation for ${key}`)
      }
    }
  }
}
