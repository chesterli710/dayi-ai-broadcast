/**
 * 中文语言包
 * 包含应用中所有需要翻译的文本
 */
export default {
  app: {
    name: '大医AI导播系统',
    version: '版本'
  },
  nav: {
    planSelection: '计划选择'
  },
  login: {
    title: '欢迎登录',
    subtitle: '大医AI导播系统',
    phonePlaceholder: '请输入手机号',
    passwordPlaceholder: '请输入密码',
    loginButton: '登录',
    phoneRequired: '请输入手机号',
    phoneInvalid: '请输入有效的手机号',
    passwordRequired: '请输入密码',
    passwordLength: '密码长度不能少于6位',
    testAccount: '测试账号',
    phoneTest: '手机号',
    passwordTest: '密码'
  },
  planSelection: {
    title: '计划选择',
    subtitle: '请选择要操作的直播计划',
    channels: '频道列表',
    plans: '计划列表',
    branches: '分支列表',
    noChannels: '暂无可用频道',
    noPlans: '暂无可用计划',
    noBranches: '暂无可用分支',
    enterButton: '进入',
    scheduleCount: '{count}个日程',
    loadingChannels: '加载频道列表中...',
    loadingPlans: '加载计划列表中...',
    loadingBranches: '加载分支列表中...',
    errorLoadingChannels: '获取频道列表失败，请稍后重试',
    retry: '重试',
    logout: '退出登录',
    logoutConfirm: '确定要退出登录吗？',
    logoutSuccess: '已退出登录'
  },
  common: {
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    loading: '加载中',
    noData: '暂无数据',
    operation: '操作',
    success: '成功',
    failed: '失败',
    unknown: '未知',
    yes: '是',
    no: '否'
  },
  titleBar: {
    back: '返回',
    notLoggedIn: '未登录'
  },
  themeSwitch: {
    toDarkMode: '切换到暗色模式',
    toLightMode: '切换到亮色模式'
  },
  languageSwitch: {
    tooltip: '切换语言'
  },
  scheduleManager: {
    title: '日程管理',
    noSchedules: '当前计划分支没有日程',
    surgeryType: '手术演示',
    lectureType: '讲课',
    unknownType: '未知类型',
    unnamedSchedule: '未命名日程',
    unnamedLayout: '未命名布局',
    minutes: '分钟',
    unsetTime: '未设置时间',
    editSchedule: '编辑日程'
  },
  scheduleEditor: {
    createTitle: '新建日程',
    editTitle: '编辑日程',
    type: '日程类型',
    startTime: '开始时间',
    plannedStartTime: '预计开始时间',
    duration: '持续时间（分钟）',
    durationHoursMinutes: '持续时间',
    hours: '小时',
    minutes: '分钟',
    plannedEndTime: '预计结束时间',
    surgeryInfo: '手术信息',
    procedure: '术式名称',
    surgeons: '术者列表',
    surgeonsLimit: '（最多3位）',
    addSurgeon: '添加术者',
    guests: '嘉宾列表',
    guestsLimit: '（最多10位）',
    addGuest: '添加嘉宾',
    noGuests: '暂无嘉宾，点击下方按钮添加',
    lectureInfo: '讲课信息',
    topic: '讲课主题',
    speaker: '讲者信息',
    name: '姓名',
    title: '职称',
    organization: '单位',
    typeRequired: '请选择日程类型',
    procedureRequired: '请输入术式名称',
    topicRequired: '请输入讲课主题',
    selectOrCreate: '请选择一个日程或创建新日程',
    layouts: '布局管理',
    noLayouts: '暂无布局',
    addLayout: '添加布局'
  },
  layoutEditor: {
    title: '布局编辑器',
    mediaSources: '媒体源',
    refreshing: '刷新中...',
    refresh: '刷新',
    dragHint: '拖放媒体源到此处',
    deleteSource: '删除媒体源',
    preview: '预览',
    live: '直播',
    streaming: '直播中',
    notStarted: '未开始',
    saveOptions: '保存布局',
    saveCurrentOnly: '仅保存当前布局',
    saveCurrentDesc: '将编辑应用到当前布局，其他布局不受影响',
    saveSimilar: '保存到相似布局',
    saveSimilarDesc: '将编辑应用到所有相同类型和模板的布局',
    noAvailableSources: '没有可用的{type}'
  },
  statusBar: {
    network: '正常',
    video: '正常',
    audio: '正常',
    stream: '未开始'
  },
  liveControlPanel: {
    title: '直播控制',
    emptyText: '直播控制面板开发中',
    startLive: '开始直播',
    stopLive: '停止直播',
    streamSettings: '推流设置',
    recordSettings: '录制设置',
    streamStatus: '推流状态',
    bitrate: '码率',
    fps: '帧率',
    resolution: '分辨率',
    codec: '编码器'
  },
  audioPanel: {
    title: '音频控制',
    noDevices: '没有可用的音频设备',
    volume: '音量',
    mute: '静音',
    deviceTypes: {
      microphone: '麦克风',
      systemAudio: '系统音频',
      unknown: '未知设备'
    }
  }
} 