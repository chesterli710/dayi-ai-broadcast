<template>
  <div class="live-canvas">
    <div class="canvas-header">
      <h3>{{ $t('layoutEditor.live') }}</h3>
      <div class="stream-status">
        <span class="status-indicator" :class="{ 'active': isStreaming }"></span>
        <span>{{ isStreaming ? $t('layoutEditor.streaming') : $t('layoutEditor.notStarted') }}</span>
      </div>
    </div>
    <div class="canvas-container">
      <!-- 直播画布内容将在后续开发中添加 -->
      <div class="placeholder">
        <span>{{ $t('layoutEditor.live') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 直播画布组件
 * 显示当前直播的实际输出效果
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// 直播状态（后续会从store中获取）
const isStreaming = ref(false);
</script>

<style scoped>
.live-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--el-bg-color);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.canvas-header {
  padding: 10px 15px;
  background-color: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.canvas-header h3 {
  margin: 0;
  font-size: var(--el-font-size-medium);
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.stream-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--el-font-size-small);
  color: var(--el-text-color-regular);
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--el-text-color-disabled);
}

.status-indicator.active {
  background-color: var(--el-color-danger);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

.canvas-container {
  flex: 1;
  position: relative;
  background-color: #000;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9比例 */
  overflow: hidden;
}

.placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #666;
  font-size: var(--el-font-size-medium);
}
</style> 