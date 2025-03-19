/**
 * 初始化画布
 */
function initCanvas() {
  if (!canvas.value || !canvasContainer.value) {
    console.error('[PreviewCanvas.vue 预览画布] 无法初始化画布：canvas或container为null');
    return;
  }
  
  const canvasElement = canvas.value;
  const container = canvasContainer.value;
  
  // 获取容器尺寸
  const containerRect = container.getBoundingClientRect();
  console.log('[PreviewCanvas.vue 预览画布] 容器尺寸:', {
    width: containerRect.width,
    height: containerRect.height
  });
  
  // 计算画布CSS显示尺寸，保持16:9比例
  let width = containerRect.width;
  let height = containerRect.width * (9 / 16);
  
  // 如果计算的高度超过容器高度，则以容器高度为基准
  if (height > containerRect.height) {
    height = containerRect.height;
    width = height * (16 / 9);
  }
  
  // 确保尺寸为整数
  width = Math.floor(width);
  height = Math.floor(height);
  
  console.log('[PreviewCanvas.vue 预览画布] 计算的画布显示尺寸:', {
    width,
    height,
    ratio: (width / height).toFixed(2)
  });
  
  // 设置画布元素的样式
  canvasElement.style.width = '100%';
  canvasElement.style.height = '100%';
  canvasElement.style.objectFit = 'contain';
  
  // 销毁旧的渲染器
  if (renderer.value) {
    console.log('[PreviewCanvas.vue 预览画布] 销毁旧渲染器');
    renderer.value.destroy();
    renderer.value = null;
  }
  
  try {
    // 创建新的渲染器
    if (useWebGL.value) {
      console.log('[PreviewCanvas.vue 预览画布] 使用WebGL渲染器');
      renderer.value = createWebGLCanvasRenderer(canvasElement);
    } else {
      console.log('[PreviewCanvas.vue 预览画布] 使用Canvas 2D渲染器');
      renderer.value = createPreviewCanvasRenderer(canvasElement);
    }
    
    // 确保渲染器已创建
    if (!renderer.value) {
      console.error('[PreviewCanvas.vue 预览画布] 渲染器创建失败');
      return;
    }
    
    // 调整画布显示尺寸（不改变实际渲染尺寸，渲染始终为1920*1080）
    console.log('[PreviewCanvas.vue 预览画布] 设置画布显示尺寸:', width, height);
    renderer.value.resize(width, height);
    
    // 设置当前布局
    if (previewingLayout.value) {
      console.log('[PreviewCanvas.vue 预览画布] 设置初始布局:', {
        id: previewingLayout.value.id,
        template: previewingLayout.value.template
      });
      renderer.value.setLayout(previewingLayout.value);
    } else {
      console.log('[PreviewCanvas.vue 预览画布] 没有初始布局可设置');
    }
    
    // 监听容器大小变化
    if (container) {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          
          // 只有当尺寸变化超过一定阈值时才调整画布显示尺寸
          if (width > 0 && height > 0 && renderer.value) {
            console.log('[PreviewCanvas.vue 预览画布] 容器尺寸变化:', {
              width: Math.floor(width),
              height: Math.floor(height)
            });
            
            // 计算新的画布显示尺寸，保持16:9比例
            let newWidth = width;
            let newHeight = width * (9 / 16);
            
            if (newHeight > height) {
              newHeight = height;
              newWidth = height * (16 / 9);
            }
            
            // 确保尺寸为整数
            newWidth = Math.floor(newWidth);
            newHeight = Math.floor(newHeight);
            
            // 更新画布样式
            canvasElement.style.width = '100%';
            canvasElement.style.height = '100%';
            
            // 仅调整CSS显示尺寸，不改变渲染尺寸（始终为1920*1080）
            renderer.value.resize(newWidth, newHeight);
          }
        }
      });
      
      resizeObserver.observe(container);
      console.log('[PreviewCanvas.vue 预览画布] 已设置容器大小监听');
    }
  } catch (error) {
    console.error('[PreviewCanvas.vue 预览画布] 初始化画布时出错:', error);
  }
} 