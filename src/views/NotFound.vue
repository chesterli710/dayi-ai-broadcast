<template>
  <div class="not-found-container">
    <el-result
      icon="error"
      :title="t('notFound.title')"
      :sub-title="t('notFound.message')"
    >
      <template #extra>
        <el-button type="primary" @click="goHome">{{ t('notFound.back') }}</el-button>
      </template>
    </el-result>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

/**
 * 404页面组件
 * 当用户访问不存在的路由时显示
 */
export default defineComponent({
  name: 'NotFoundView',
  setup() {
    const router = useRouter()
    const { t } = useI18n()
    
    /**
     * 返回首页
     */
    const goHome = () => {
      router.push('/')
    }
    
    return {
      goHome,
      t
    }
  }
})
</script>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
</style> 