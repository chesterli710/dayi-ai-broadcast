<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>{{ $t('login.title') }}</h1>
        <p>{{ $t('login.subtitle') }}</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="phone">
          <el-input
            v-model="loginForm.phone"
            :placeholder="$t('login.phonePlaceholder')"
            prefix-icon="Phone"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            :placeholder="$t('login.passwordPlaceholder')"
            prefix-icon="Lock"
            type="password"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            class="login-button"
            :loading="userStore.loginLoading"
            @click="handleLogin"
          >
            {{ $t('login.loginButton') }}
          </el-button>
        </el-form-item>
        
        <div v-if="userStore.loginError" class="login-error">
          {{ userStore.loginError }}
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '../stores/userStore'
import { Phone, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const userStore = useUserStore()
const loginFormRef = ref<FormInstance>()

// 登录表单数据
const loginForm = reactive({
  phone: '',
  password: ''
})

// 表单验证规则
const loginRules = reactive<FormRules>({
  phone: [
    { required: true, message: t('login.phoneRequired'), trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: t('login.phoneInvalid'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('login.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('login.passwordLength'), trigger: 'blur' }
  ]
})

/**
 * 处理登录
 */
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      await userStore.loginWithPhone(loginForm.phone, loginForm.password)
    }
  })
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background-color: var(--el-bg-color-page);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.login-card {
  width: 400px;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background-color: var(--el-bg-color-overlay);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: 24px;
    color: var(--el-text-color-primary);
    margin-bottom: 10px;
  }
  
  p {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.login-form {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  padding: 12px 0;
}

.login-error {
  color: var(--el-color-danger);
  font-size: 14px;
  text-align: center;
  margin-top: 10px;
}
</style> 