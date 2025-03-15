<template>
  <div class="preview-canvas">
    <div class="canvas-header">
      <h3>{{ $t('layoutEditor.preview') }}</h3>
    </div>
    <div class="canvas-container">
      <!-- 预览画布内容将在后续开发中添加 -->
      <div class="placeholder">
        <span>{{ $t('layoutEditor.preview') }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 预览画布组件
 * 显示当前布局的预览效果
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.preview-canvas {
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
}

.canvas-header h3 {
  margin: 0;
  font-size: var(--el-font-size-medium);
  font-weight: 500;
  color: var(--el-text-color-primary);
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