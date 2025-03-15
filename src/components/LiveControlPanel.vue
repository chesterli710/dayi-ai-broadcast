<template>
  <div class="live-control-panel">
    <div class="panel-header">
      <h3>{{ $t('liveControlPanel.title') }}</h3>
    </div>
    <div class="panel-content">
      <!-- 直播控制面板内容将在这里实现 -->
      <el-empty :description="$t('liveControlPanel.emptyText')" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 直播控制面板组件
 * 用于控制直播相关功能
 */
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { usePlanStore } from '../stores/planStore';

const { t } = useI18n();
const planStore = usePlanStore();

// 当前直播状态
const isLive = ref(false);

/**
 * 切换直播状态
 */
function toggleLiveStatus() {
  isLive.value = !isLive.value;
  // 这里将来会添加实际的直播控制逻辑
}
</script>

<style scoped>
.live-control-panel {
  height: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background-color: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 10px 15px;
  border-bottom: 1px solid var(--el-border-color);
  background-color: var(--el-fill-color-light);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: bold;
  color: var(--el-text-color-primary);
}

.panel-content {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style> 