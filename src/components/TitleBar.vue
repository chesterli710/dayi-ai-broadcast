<template>
  <div class="title-bar">
    <div class="left-section">
      <button class="back-button" @click="goBack" :title="$t('titleBar.back')">
        <i class="bi bi-chevron-left"></i>
      </button>
      <div class="info-section">
        <span v-if="planStore.currentChannel">{{ planStore.currentChannel.name }}</span>
        <span v-if="planStore.currentChannel && planStore.currentPlan"> / </span>
        <span v-if="planStore.currentPlan">{{ planStore.currentPlan.name }}</span>
        <span v-if="planStore.currentPlan && planStore.currentBranch"> / </span>
        <span v-if="planStore.currentBranch">{{ planStore.currentBranch.name }}</span>
      </div>
    </div>
    <div class="right-section">
      <LanguageSwitch />
      <ThemeSwitch />
      <div class="user-info">
        <span>{{ userStore.userInfo?.nickname || $t('titleBar.notLoggedIn') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 标题栏组件
 * 显示当前频道/计划/分支信息，提供返回按钮和用户设置
 */
import { useRouter } from 'vue-router';
import { usePlanStore } from '../stores/planStore';
import { useUserStore } from '../stores/userStore';
import { useI18n } from 'vue-i18n';
import LanguageSwitch from './LanguageSwitch.vue';
import ThemeSwitch from './ThemeSwitch.vue';

const router = useRouter();
const planStore = usePlanStore();
const userStore = useUserStore();
const { t } = useI18n();

/**
 * 返回计划选择页面
 */
function goBack() {
  router.push('/plan-selection');
}
</script>

<style scoped>
.title-bar {
  width: 100%;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.left-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background-color: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.3s;
}

.back-button:hover {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-border-color-hover);
}

.info-section {
  font-size: var(--el-font-size-medium);
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.right-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  font-size: var(--el-font-size-base);
  font-weight: 500;
  color: var(--el-text-color-primary);
  padding: 8px 12px;
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-fill-color-light);
}
</style> 