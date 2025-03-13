import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '../stores/userStore'

/**
 * 路由配置类
 * 负责管理应用的路由配置和导航
 */
class RouterConfig {
  /**
   * 路由记录数组
   * 定义应用的所有路由
   */
  private routes: Array<RouteRecordRaw> = [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: {
        title: '登录',
        requiresAuth: false
      }
    },
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/Home.vue'),
      meta: {
        title: '首页',
        requiresAuth: true
      }
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/About.vue'),
      meta: {
        title: '关于',
        requiresAuth: true
      }
    },
    {
      path: '/theme',
      name: 'Theme',
      component: () => import('../views/ThemeSettings.vue'),
      meta: {
        title: '主题设置',
        requiresAuth: true
      }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue'),
      meta: {
        title: '页面未找到',
        requiresAuth: false
      }
    }
  ]

  /**
   * 创建路由实例
   * @returns Vue Router实例
   */
  public createRouter() {
    const router = createRouter({
      history: createWebHashHistory(), // 使用hash模式，适合Electron应用
      routes: this.routes
    })

    // 全局前置守卫，处理登录验证和页面标题
    router.beforeEach(async (to, from, next) => {
      // 设置页面标题
      document.title = `${to.meta.title || '大易AI播报'}`
      
      // 检查路由是否需要登录验证
      if (to.meta.requiresAuth) {
        // 获取用户状态
        const userStore = useUserStore()
        const isLoggedIn = await userStore.checkLoginStatus()
        
        if (!isLoggedIn) {
          // 未登录，重定向到登录页
          next({ name: 'Login' })
          return
        }
      }
      
      next()
    })

    return router
  }
}

// 导出路由实例
export default new RouterConfig().createRouter() 