<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount, onMounted } from 'vue'
import imagePreloader from './utils/imagePreloader'

/**
 * 应用根组件
 * 提供应用的基本布局
 */
export default defineComponent({
  name: 'App',
  setup() {
    let errorHandlerCleanup: (() => void) | null = null;
    
    onMounted(() => {
      // 初始化全局图片错误处理器
      errorHandlerCleanup = imagePreloader.initializeErrorHandlers();
      console.log('[App.vue] 已初始化全局图片错误处理器');
      
      // 禁用特定域名的缩略图加载
      const blacklistedDomains = [
        'example.com',
        'thumbnails.example.org',
        'img.example.net'
      ];
      
      // 将特定域名添加到黑名单
      blacklistedDomains.forEach(domain => {
        imagePreloader.addBlacklistedDomain(domain);
      });
      
      // 阻止特定错误显示在控制台
      window.console.error = new Proxy(window.console.error, {
        apply(target, thisArg, argumentsList) {
          const errorMessage = String(argumentsList[0] || '');
          // 如果是图片加载错误或CORS错误，则不显示
          if (errorMessage.includes('CORS') || 
              errorMessage.includes('404') || 
              errorMessage.includes('Failed to load') || 
              errorMessage.includes('Image') || 
              errorMessage.includes('image') ||
              errorMessage.includes('example.com')) {
            return;
          }
          // 否则正常显示错误
          return Reflect.apply(target, thisArg, argumentsList);
        }
      });
    });
    
    onBeforeUnmount(() => {
      // 清理全局图片错误处理器
      if (errorHandlerCleanup) {
        errorHandlerCleanup();
        console.log('[App.vue] 已清理全局图片错误处理器');
      }
    });
  }
})
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 0;
}
</style>
