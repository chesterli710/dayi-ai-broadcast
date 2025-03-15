import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import elementPlus from './plugins/element-plus'
import i18n from './plugins/i18n'
import setupDirectives from './plugins/directives'
import { setupMock } from './mock'
import './styles/theme.scss'
import './styles/disable-selection.scss'
import './style.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

// 初始化 Mock 服务
setupMock()

/**
 * 应用初始化
 * 创建Vue应用实例并挂载
 */
const app = createApp(App)

// 注册路由
app.use(router)

// 注册状态管理
app.use(pinia)

// 注册Element Plus
app.use(elementPlus)

// 注册国际化插件
app.use(i18n)

// 注册自定义指令
setupDirectives(app)

// 挂载应用
app.mount('#app')
