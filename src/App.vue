<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

/**
 * 应用根组件
 * 提供应用的基本布局
 */
export default defineComponent({
  name: 'App'
})
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  line-height: 1.6;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 确保html和body元素也占满整个屏幕 */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
