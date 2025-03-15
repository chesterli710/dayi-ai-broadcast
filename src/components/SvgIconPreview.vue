<template>
  <div class="svg-icon-preview">
    <div class="search-bar">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索图标..." 
        class="search-input"
      />
      <div class="variant-selector">
        <label>
          <input type="radio" v-model="selectedVariant" value="line" /> 线性
        </label>
        <label>
          <input type="radio" v-model="selectedVariant" value="fill" /> 填充
        </label>
      </div>
    </div>
    
    <div class="icons-container">
      <div v-if="loading" class="loading-indicator">
        加载图标中...
      </div>
      <div v-else-if="filteredIcons.length === 0" class="no-results">
        没有找到匹配的图标
      </div>
      <div 
        v-else 
        v-for="icon in filteredIcons" 
        :key="icon.name" 
        class="icon-item"
        @click="copyIconCode(icon.name)"
      >
        <div class="icon-preview">
          <SvgIcon :name="icon.name" :variant="selectedVariant" :size="32" />
        </div>
        <div class="icon-name">{{ icon.name }}</div>
      </div>
    </div>
    
    <div v-if="showCopyMessage" class="copy-message">
      已复制到剪贴板
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import SvgIcon from './SvgIcon.vue';

// 图标列表
const icons = ref<Array<{ name: string }>>([]);
// 加载状态
const loading = ref<boolean>(true);
// 搜索查询
const searchQuery = ref<string>('');
// 选中的变体
const selectedVariant = ref<'line' | 'fill'>('line');
// 显示复制消息
const showCopyMessage = ref<boolean>(false);

// 过滤后的图标
const filteredIcons = computed(() => {
  if (!searchQuery.value) {
    return icons.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return icons.value.filter(icon => 
    icon.name.toLowerCase().includes(query)
  );
});

/**
 * 获取所有图标
 */
async function fetchIcons() {
  loading.value = true;
  
  try {
    // 这里我们通过API获取图标列表
    // 在实际应用中，你可能需要根据你的后端API调整
    const response = await fetch('/api/svg-icons');
    
    if (!response.ok) {
      throw new Error('无法获取图标列表');
    }
    
    const data = await response.json();
    icons.value = data.icons;
  } catch (error) {
    console.error('[SvgIconPreview] 获取图标列表失败:', error);
    
    // 如果API不可用，我们可以使用一些预定义的图标
    icons.value = [
      { name: 'delete' },
      { name: 'user' },
      { name: 'video' },
      { name: 'webcam' },
      { name: 'window' },
      { name: 'volume-up' },
      // 添加更多图标...
    ];
  } finally {
    loading.value = false;
  }
}

/**
 * 复制图标代码到剪贴板
 */
function copyIconCode(iconName: string) {
  const code = `<SvgIcon name="${iconName}" variant="${selectedVariant.value}" />`;
  
  navigator.clipboard.writeText(code)
    .then(() => {
      showCopyMessage.value = true;
      setTimeout(() => {
        showCopyMessage.value = false;
      }, 2000);
    })
    .catch(err => {
      console.error('无法复制到剪贴板:', err);
    });
}

// 组件挂载时获取图标
onMounted(() => {
  fetchIcons();
});
</script>

<style scoped>
.svg-icon-preview {
  padding: 20px;
  position: relative;
}

.search-bar {
  display: flex;
  margin-bottom: 20px;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.variant-selector {
  margin-left: 16px;
  display: flex;
  gap: 12px;
}

.icons-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-item:hover {
  background-color: #f5f5f5;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.icon-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 48px;
  margin-bottom: 8px;
}

.icon-name {
  font-size: 12px;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.loading-indicator,
.no-results {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #999;
}

.copy-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
}
</style> 