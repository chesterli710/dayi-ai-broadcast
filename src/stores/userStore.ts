import { defineStore } from 'pinia'
import { ref } from 'vue'
import userApi from '../api/user'
import type { UserInfo } from '../mock/user'
import router from '../router'

/**
 * 用户状态存储
 * 管理用户登录状态、用户信息等
 */
export const useUserStore = defineStore('user', () => {
  /**
   * 用户令牌
   */
  const token = ref<string>(localStorage.getItem('token') || '')
  
  /**
   * 用户信息
   */
  const userInfo = ref<UserInfo | null>(null)
  
  /**
   * 登录状态
   */
  const isLoggedIn = ref<boolean>(!!token.value)
  
  /**
   * 登录加载状态
   */
  const loginLoading = ref<boolean>(false)
  
  /**
   * 登录错误信息
   */
  const loginError = ref<string>('')
  
  /**
   * 使用手机号和密码登录
   * @param phone - 手机号
   * @param password - 密码
   * @returns Promise
   */
  async function loginWithPhone(phone: string, password: string) {
    try {
      loginLoading.value = true
      loginError.value = ''
      
      const res = await userApi.login({
        username: phone, // 使用手机号作为用户名
        password
      })
      
      // 保存token到本地存储和状态
      const { token: userToken } = res.data
      token.value = userToken
      localStorage.setItem('token', userToken)
      isLoggedIn.value = true
      
      // 获取用户信息
      await getUserInfo()
      
      // 登录成功后跳转到首页
      router.push('/')
      
      return true
    } catch (error: any) {
      loginError.value = error.message || '登录失败，请稍后重试'
      return false
    } finally {
      loginLoading.value = false
    }
  }
  
  /**
   * 获取用户信息
   * @returns Promise
   */
  async function getUserInfo() {
    try {
      if (!token.value) return null
      
      const res = await userApi.getUserInfo()
      userInfo.value = res.data
      return res.data
    } catch (error) {
      // 获取用户信息失败，可能是token过期
      logout()
      return null
    }
  }
  
  /**
   * 退出登录
   */
  function logout() {
    // 清除token和用户信息
    token.value = ''
    userInfo.value = null
    isLoggedIn.value = false
    localStorage.removeItem('token')
    
    // 调用退出登录API（不等待结果）
    userApi.logout().catch(error => {
      console.error('退出登录失败', error)
    })
    
    // 跳转到登录页
    router.push('/login')
  }
  
  /**
   * 检查登录状态
   * 如果有token但没有用户信息，则获取用户信息
   */
  async function checkLoginStatus() {
    if (token.value && !userInfo.value) {
      await getUserInfo()
    }
    return isLoggedIn.value
  }
  
  return {
    token,
    userInfo,
    isLoggedIn,
    loginLoading,
    loginError,
    loginWithPhone,
    getUserInfo,
    logout,
    checkLoginStatus
  }
}) 