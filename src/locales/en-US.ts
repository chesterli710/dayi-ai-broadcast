/**
 * 英文语言包
 * 包含应用中所有需要翻译的文本
 */
export default {
  app: {
    name: 'DaYi AI Director System',
    version: 'Version'
  },
  nav: {
    planSelection: 'Plan Selection'
  },
  login: {
    title: 'Welcome',
    subtitle: 'DaYi AI Director System',
    phonePlaceholder: 'Enter your phone number',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Login',
    phoneRequired: 'Please enter your phone number',
    phoneInvalid: 'Please enter a valid phone number',
    passwordRequired: 'Please enter your password',
    passwordLength: 'Password must be at least 6 characters',
    testAccount: 'Test Account',
    phoneTest: 'Phone',
    passwordTest: 'Password'
  },
  planSelection: {
    title: 'Plan Selection',
    subtitle: 'Please select a broadcast plan to operate',
    channels: 'Channel List',
    plans: 'Plan List',
    branches: 'Branch List',
    noChannels: 'No available channels',
    noPlans: 'No available plans',
    noBranches: 'No available branches',
    enterButton: 'Enter',
    scheduleCount: '{count} schedules',
    loadingChannels: 'Loading channels...',
    loadingPlans: 'Loading plans...',
    loadingBranches: 'Loading branches...',
    errorLoadingChannels: 'Failed to load channels, please try again later',
    retry: 'Retry',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to logout?',
    logoutSuccess: 'Logged out successfully'
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading',
    noData: 'No Data',
    operation: 'Operation',
    success: 'Success',
    failed: 'Failed',
    unknown: 'Unknown',
    yes: 'Yes',
    no: 'No'
  },
  titleBar: {
    back: 'Back',
    notLoggedIn: 'Not Logged In'
  },
  themeSwitch: {
    toDarkMode: 'Switch to Dark Mode',
    toLightMode: 'Switch to Light Mode'
  },
  languageSwitch: {
    tooltip: 'Switch Language'
  },
  scheduleManager: {
    title: 'Schedule Manager',
    noSchedules: 'No schedules in current plan branch',
    surgeryType: 'Surgery Demo',
    lectureType: 'Lecture',
    unknownType: 'Unknown Type',
    unnamedSchedule: 'Unnamed Schedule',
    unnamedLayout: 'Unnamed Layout',
    minutes: 'minutes',
    unsetTime: 'Time not set'
  },
  layoutEditor: {
    title: 'Layout Editor',
    mediaSources: 'Media Sources',
    refreshing: 'Refreshing...',
    refresh: 'Refresh',
    dragHint: 'Drag media source here',
    deleteSource: 'Delete media source',
    preview: 'Preview',
    live: 'Live',
    streaming: 'Streaming',
    notStarted: 'Not Started',
    saveOptions: 'Save Layout',
    saveCurrentOnly: 'Save Current Layout Only',
    saveCurrentDesc: 'Apply edits to current layout only, other layouts will not be affected',
    saveSimilar: 'Save to Similar Layouts',
    saveSimilarDesc: 'Apply edits to all layouts with same type and template',
    noAvailableSources: 'No available {type}'
  },
  statusBar: {
    network: 'Normal',
    video: 'Normal',
    audio: 'Normal',
    stream: 'Not Started'
  },
  liveControlPanel: {
    title: 'Live Control',
    emptyText: 'Live control panel under development',
    startLive: 'Start Live',
    stopLive: 'Stop Live',
    streamSettings: 'Stream Settings',
    recordSettings: 'Record Settings',
    streamStatus: 'Stream Status',
    bitrate: 'Bitrate',
    fps: 'FPS',
    resolution: 'Resolution',
    codec: 'Codec'
  },
  audioPanel: {
    title: 'Audio Control',
    noDevices: 'No audio devices available',
    volume: 'Volume',
    mute: 'Mute',
    deviceTypes: {
      microphone: 'Microphone',
      systemAudio: 'System Audio',
      unknown: 'Unknown Device'
    }
  }
} 