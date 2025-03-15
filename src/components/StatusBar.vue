<template>
  <div class="status-bar">
    <div class="status-item">
      <i class="fas fa-signal"></i>
      <span>{{ networkStatus }}</span>
    </div>
    <div class="status-item">
      <i class="fas fa-video"></i>
      <span>{{ videoStatus }}</span>
    </div>
    <div class="status-item">
      <i class="fas fa-microphone"></i>
      <span>{{ audioStatus }}</span>
    </div>
    <div class="status-item">
      <i class="fas fa-clock"></i>
      <span>{{ currentTime }}</span>
    </div>
    <div class="status-item">
      <i class="fas fa-upload"></i>
      <span>{{ streamStatus }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 状态栏组件
 * 显示系统状态信息
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 网络状态
const networkStatus = ref(t('statusBar.network'));

// 视频状态
const videoStatus = ref(t('statusBar.video'));

// 音频状态
const audioStatus = ref(t('statusBar.audio'));

// 当前时间
const currentTime = ref('');

// 推流状态
const streamStatus = ref(t('statusBar.stream'));

// 更新当前时间
function updateTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  currentTime.value = `${hours}:${minutes}:${seconds}`;
}

// 定时器
let timer: number;

onMounted(() => {
  // 初始化时间
  updateTime();
  
  // 设置定时器，每秒更新一次时间
  timer = window.setInterval(updateTime, 1000);
});

onUnmounted(() => {
  // 清除定时器
  clearInterval(timer);
});
</script>

<style scoped>
.status-bar {
  width: 100%;
  height: 30px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background-color: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color);
  font-size: var(--el-font-size-extra-small);
  color: var(--el-text-color-secondary);
}

.status-item {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.status-item i {
  margin-right: 5px;
  color: var(--el-text-color-regular);
}
</style> 