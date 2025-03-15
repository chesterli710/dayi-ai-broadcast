import Mock from 'mockjs'

/**
 * 设置SVG图标相关的Mock API
 */
export function setupSvgIconsMock() {
  // 获取所有SVG图标
  Mock.mock('/api/svg-icons', 'get', () => {
    try {
      // 在实际环境中，这里应该从服务器获取图标列表
      // 由于这是Mock API，我们返回一些预定义的图标
      
      const icons = [
        { name: 'delete' },
        { name: 'user' },
        { name: 'video' },
        { name: 'webcam' },
        { name: 'window' },
        { name: 'volume-up' },
        { name: 'volume-down' },
        { name: 'volume-mute' },
        { name: 'wifi' },
        { name: 'wifi-off' },
        { name: 'walk' },
        { name: 'vuejs' },
        { name: 'wechat' },
        { name: 'weibo' },
        { name: 'whatsapp' },
        { name: 'youtube' },
        { name: 'zoom-in' },
        { name: 'zoom-out' },
        { name: 'zhihu' },
        { name: 'zcool' },
        { name: 'xbox' },
        { name: 'xing' },
        { name: 'women' },
        { name: 'windy' },
        { name: 'windows' },
        { name: 'wallet' },
        { name: 'water-flash' },
        { name: 'vip' },
        { name: 'vip-crown' },
        { name: 'vip-diamond' },
        { name: 'visa' },
        { name: 'voice-recognition' },
        { name: 'voiceprint' },
        { name: 'user-voice' },
        { name: 'user-settings' },
        { name: 'user-search' },
        { name: 'user-received' },
        { name: 'user-shared-2' },
        { name: 'user-unfollow' },
        { name: 'video-chat' },
        { name: 'vidicon' },
        { name: 'vidicon-2' },
        { name: 'anti-noise' },
        { name: 'anti-echo' },
        { name: 'auto-gain' },
        { name: 'headphone' },
      ];
      
      return {
        code: 0,
        message: 'success',
        icons
      };
    } catch (error) {
      console.error('获取SVG图标列表失败:', error);
      return {
        code: 500,
        message: '获取SVG图标列表失败',
        icons: []
      };
    }
  });
} 