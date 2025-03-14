/**
 * 平台工具类
 * 用于检测当前运行环境的操作系统类型
 */

/**
 * 检查当前是否为MacOS系统
 * @returns boolean 是否为MacOS系统
 */
export function isMacOS(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

/**
 * 检查当前是否为Windows系统
 * @returns boolean 是否为Windows系统
 */
export function isWindows(): boolean {
  return navigator.platform.toUpperCase().indexOf('WIN') >= 0;
}

/**
 * 检查当前是否为Linux系统
 * @returns boolean 是否为Linux系统
 */
export function isLinux(): boolean {
  return navigator.platform.toUpperCase().indexOf('LINUX') >= 0;
} 