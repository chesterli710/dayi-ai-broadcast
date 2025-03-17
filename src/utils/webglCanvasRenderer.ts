/**
 * WebGL画布渲染器工具类
 * 用于高性能绘制预览和直播画面
 */
import type { Layout, LayoutElement, MediaLayoutElement, TextLayoutElement } from '../types/broadcast';
import { useVideoStore } from '../stores/videoStore';
import { usePlanStore } from '../stores/planStore';

/**
 * WebGL画布渲染器类
 * 负责使用WebGL高性能绘制预览和直播画面
 */
export class WebGLCanvasRenderer {
  // 画布元素
  private canvas: HTMLCanvasElement;
  
  // WebGL渲染上下文
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  
  // 着色器程序
  private shaderProgram: WebGLProgram | null = null;
  
  // 当前布局
  private currentLayout: Layout | null = null;
  
  // 渲染尺寸
  private width: number = 1920;
  private height: number = 1080;
  
  // 视频存储
  private videoStore = useVideoStore();
  
  // 计划存储
  private planStore = usePlanStore();
  
  // 动画帧请求ID
  private animationFrameId: number | null = null;
  
  // 纹理缓存
  private textureCache: Map<string, WebGLTexture> = new Map();
  
  // 顶点缓冲区
  private vertexBuffer: WebGLBuffer | null = null;
  
  // 纹理坐标缓冲区
  private texCoordBuffer: WebGLBuffer | null = null;
  
  /**
   * 构造函数
   * @param canvas 画布元素
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 初始化渲染器', {
      canvasElement: canvas,
      width: canvas.width,
      height: canvas.height
    });
    this.initWebGL();
  }
  
  /**
   * 初始化WebGL
   */
  private initWebGL(): void {
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 开始初始化WebGL');
    
    try {
      // 设置画布尺寸
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      
      // 设置初始样式尺寸
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      
      console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 画布尺寸已设置', {
        width: this.canvas.width,
        height: this.canvas.height,
        styleWidth: this.canvas.style.width,
        styleHeight: this.canvas.style.height
      });
      
      // 尝试获取WebGL2上下文，如果不支持则回退到WebGL1
      this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      
      if (!this.gl) {
        console.error('[webglCanvasRenderer.ts WebGL画布渲染器] 无法获取WebGL渲染上下文');
        return;
      }
      
      const isWebGL2 = this.gl instanceof WebGL2RenderingContext;
      console.log(`[webglCanvasRenderer.ts WebGL画布渲染器] ${isWebGL2 ? 'WebGL2' : 'WebGL1'}渲染上下文已获取`);
      
      // 初始化着色器
      this.initShaders();
      
      // 初始化缓冲区
      this.initBuffers();
      
      // 设置WebGL状态
      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      
      // 绘制一个测试图形，确认WebGL可用
      this.drawTestPattern();
      
      console.log('[webglCanvasRenderer.ts WebGL画布渲染器] WebGL初始化完成');
    } catch (error) {
      console.error('[webglCanvasRenderer.ts WebGL画布渲染器] 初始化WebGL时出错:', error);
    }
  }
  
  /**
   * 初始化着色器
   */
  private initShaders(): void {
    if (!this.gl) return;
    
    // 顶点着色器源码
    const vsSource = `
      attribute vec4 aVertexPosition;
      attribute vec2 aTextureCoord;
      
      varying highp vec2 vTextureCoord;
      
      void main(void) {
        gl_Position = aVertexPosition;
        vTextureCoord = aTextureCoord;
      }
    `;
    
    // 片段着色器源码
    const fsSource = `
      precision mediump float;
      
      varying highp vec2 vTextureCoord;
      
      uniform sampler2D uSampler;
      
      void main(void) {
        gl_FragColor = texture2D(uSampler, vTextureCoord);
      }
    `;
    
    // 编译着色器
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);
    
    if (!vertexShader || !fragmentShader) {
      console.error('[webglCanvasRenderer.ts WebGL画布渲染器] 着色器编译失败');
      return;
    }
    
    // 创建着色器程序
    this.shaderProgram = this.gl.createProgram();
    
    if (!this.shaderProgram) {
      console.error('[webglCanvasRenderer.ts WebGL画布渲染器] 无法创建着色器程序');
      return;
    }
    
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);
    
    // 检查着色器程序链接状态
    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.error('[webglCanvasRenderer.ts WebGL画布渲染器] 无法初始化着色器程序:', this.gl.getProgramInfoLog(this.shaderProgram));
      return;
    }
    
    // 使用着色器程序
    this.gl.useProgram(this.shaderProgram);
    
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 着色器程序初始化成功');
  }
  
  /**
   * 编译着色器
   * @param type 着色器类型
   * @param source 着色器源码
   * @returns 编译后的着色器
   */
  private compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;
    
    const shader = this.gl.createShader(type);
    
    if (!shader) {
      console.error('[webglCanvasRenderer.ts WebGL画布渲染器] 无法创建着色器');
      return null;
    }
    
    // 设置着色器源码并编译
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    // 检查编译状态
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[webglCanvasRenderer.ts WebGL画布渲染器] 着色器编译错误:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }
  
  /**
   * 初始化缓冲区
   */
  private initBuffers(): void {
    if (!this.gl || !this.shaderProgram) return;
    
    // 创建顶点缓冲区
    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    
    // 定义一个覆盖整个画布的矩形（两个三角形）
    const positions = [
      -1.0, -1.0,  // 左下
       1.0, -1.0,  // 右下
      -1.0,  1.0,  // 左上
       1.0,  1.0,  // 右上
    ];
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);
    
    // 创建纹理坐标缓冲区
    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    
    // 定义纹理坐标
    const textureCoordinates = [
      0.0, 1.0,  // 左下
      1.0, 1.0,  // 右下
      0.0, 0.0,  // 左上
      1.0, 0.0,  // 右上
    ];
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), this.gl.STATIC_DRAW);
    
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 缓冲区初始化完成');
  }
  
  /**
   * 绘制测试图案
   */
  private drawTestPattern(): void {
    if (!this.gl || !this.shaderProgram) return;
    
    // 清空画布
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    // 创建一个测试纹理
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // 创建一个渐变色测试图像
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const r = Math.floor(x / size * 255);
        const g = Math.floor(y / size * 255);
        const b = 128;
        const a = 255;
        
        const index = (y * size + x) * 4;
        data[index + 0] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = a;
      }
    }
    
    // 上传纹理数据
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      size,
      size,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      data
    );
    
    // 设置纹理参数
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    
    // 绑定顶点缓冲区
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    const vertexPosition = this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition');
    this.gl.vertexAttribPointer(vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(vertexPosition);
    
    // 绑定纹理坐标缓冲区
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    const textureCoord = this.gl.getAttribLocation(this.shaderProgram, 'aTextureCoord');
    this.gl.vertexAttribPointer(textureCoord, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(textureCoord);
    
    // 激活纹理单元
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // 设置采样器
    const samplerLocation = this.gl.getUniformLocation(this.shaderProgram, 'uSampler');
    this.gl.uniform1i(samplerLocation, 0);
    
    // 绘制
    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 测试图案已绘制');
  }
  
  /**
   * 设置当前布局
   * @param layout 布局对象
   */
  public setLayout(layout: Layout | null): void {
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 设置布局', {
      layout,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      styleWidth: this.canvas.style.width,
      styleHeight: this.canvas.style.height
    });
    
    this.currentLayout = layout;
    
    // 如果布局为空，停止渲染循环
    if (!layout) {
      this.stopRenderLoop();
      this.clearCanvas();
      return;
    }
    
    // 启动渲染循环
    this.startRenderLoop();
  }
  
  /**
   * 清空画布
   */
  private clearCanvas(): void {
    if (!this.gl) return;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
  
  /**
   * 启动渲染循环
   */
  private startRenderLoop(): void {
    // 如果已经在运行，不重复启动
    if (this.animationFrameId !== null) return;
    
    const renderFrame = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };
    
    this.animationFrameId = requestAnimationFrame(renderFrame);
  }
  
  /**
   * 停止渲染循环
   */
  private stopRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * 渲染画面
   */
  private render(): void {
    if (!this.gl || !this.currentLayout) return;
    
    // 清空画布
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    
    // TODO: 实现WebGL渲染逻辑
    // 1. 渲染背景层
    // 2. 渲染视频层
    // 3. 渲染前景层
    // 4. 渲染文字层
  }
  
  /**
   * 调整画布大小
   * @param width 宽度
   * @param height 高度
   */
  public resize(width: number, height: number): void {
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 调整画布大小', {
      originalWidth: width,
      originalHeight: height,
      canvasElement: this.canvas
    });
    
    // 保持16:9比例
    const aspectRatio = 16 / 9;
    
    if (width / height > aspectRatio) {
      // 宽度过大，以高度为基准
      width = height * aspectRatio;
    } else {
      // 高度过大，以宽度为基准
      height = width / aspectRatio;
    }
    
    // 确保宽高至少为1px，避免画布不可见
    width = Math.max(width, 1);
    height = Math.max(height, 1);
    
    console.log('[webglCanvasRenderer.ts WebGL画布渲染器] 调整后的画布大小', {
      width,
      height
    });
    
    // 更新画布尺寸样式
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    // 更新WebGL视口
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }
  
  /**
   * 销毁渲染器
   */
  public destroy(): void {
    // 停止渲染循环
    this.stopRenderLoop();
    
    // 清空画布
    this.clearCanvas();
    
    // 删除纹理
    if (this.gl) {
      this.textureCache.forEach((texture) => {
        this.gl?.deleteTexture(texture);
      });
      this.textureCache.clear();
      
      // 删除缓冲区
      this.gl.deleteBuffer(this.vertexBuffer);
      this.gl.deleteBuffer(this.texCoordBuffer);
      
      // 删除着色器程序
      if (this.shaderProgram) {
        this.gl.deleteProgram(this.shaderProgram);
      }
    }
  }
}

/**
 * 创建WebGL画布渲染器
 * @param canvas 画布元素
 * @returns WebGL画布渲染器实例
 */
export function createWebGLCanvasRenderer(canvas: HTMLCanvasElement): WebGLCanvasRenderer {
  return new WebGLCanvasRenderer(canvas);
}