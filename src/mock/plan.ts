/**
 * 计划相关 Mock 数据
 */
import Mock from 'mockjs'
import type { Channel, Plan, Branch, Schedule, Layout } from '../types/broadcast'
import { ScheduleType } from '../types/broadcast'

/**
 * 设置计划相关的 Mock 数据
 */
export function setupPlanMock() {
  // 创建统一的数据源
  const mockChannels: Channel[] = [
    {
      id: 'channel-1',
      name: '医学频道',
      url: 'https://example.com/channel/1',
      plans: [
        {
          id: 'plan-1',
          name: '肝胆外科手术直播',
          plannedStartDateTime: new Date('2023-06-15T09:00:00'),
          plannedEndDateTime: new Date('2023-06-15T12:00:00'),
          cover: 'https://a2.vzan.com/live/11749549/upload/image/png/20250312/9a6137c37f404df3ad96b759bf201ddb.png',
          background: 'https://a2.vzan.com/live/11749549/upload/image/png/20250127/8da07910e10c46e7a6f1482f9d58c72c.png',
          labelBackground: 'https://example.com/backgrounds/label-blue.png',
          textColor: '#ffffff',
          branches: [
            {
              id: 'branch-1',
              name: '主会场',
              schedules: [
                {
                  id: 'schedule-1-1',
                  type: ScheduleType.SURGERY,
                  plannedStartDateTime: new Date('2023-06-15T09:00:00'),
                  plannedDuration: 120,
                  plannedEndDateTime: new Date('2023-06-15T11:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'surgery-single',
                      displayName: '单画面手术',
                      description: '适用于单摄像头手术直播',
                      background: 'https://example.com/backgrounds/surgery-bg.jpg'
                    }
                  ],
                  surgeryInfo: {
                    procedure: '肝胆管结石手术',
                    surgeons: [
                      {
                        name: '张医生',
                        title: '主任医师',
                        organization: '北京协和医院'
                      }
                    ]
                  }
                },
                {
                  id: 'schedule-1-2',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-15T11:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-15T12:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-single',
                      displayName: '单画面讲座',
                      description: '适用于单摄像头讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '肝胆管结石手术后的护理',
                    speaker: {
                      name: '王教授',
                      title: '教授',
                      organization: '北京协和医院'
                    }
                  }
                }
              ],
              streamConfig: {
                bitrate: 3000,
                resolution: '1920x1080',
                fps: 30,
                codec: 'h264_nvenc',
                preset: 'zerolatency',
                streamUrl: 'rtmp://live.example.com/channel1',
                streamSecret: 'live_secret_key_123'
              }
            }
          ]
        },
        {
          id: 'plan-2',
          name: '心脏外科手术直播',
          plannedStartDateTime: new Date('2023-06-20T10:00:00'),
          plannedEndDateTime: new Date('2023-06-20T14:00:00'),
          cover: 'https://example.com/covers/heart-surgery.jpg',
          branches: [
            {
              id: 'branch-2-1',
              name: '主会场',
              schedules: [
                {
                  id: 'schedule-2-1',
                  type: ScheduleType.SURGERY,
                  plannedStartDateTime: new Date('2023-06-20T10:00:00'),
                  plannedDuration: 120,
                  plannedEndDateTime: new Date('2023-06-20T12:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'surgery-double',
                      displayName: '双画面手术',
                      description: '适用于双摄像头手术直播'
                    }
                  ],
                  surgeryInfo: {
                    procedure: '心脏搭桥手术',
                    surgeons: [
                      {
                        name: '李医生',
                        title: '主任医师',
                        organization: '上海交通大学医学院附属仁济医院'
                      }
                    ]
                  }
                },
                {
                  id: 'schedule-2-2',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-20T12:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-20T13:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-single',
                      displayName: '单画面讲座',
                      description: '适用于单摄像头讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '心脏搭桥手术技术进展',
                    speaker: {
                      name: '李教授',
                      title: '教授',
                      organization: '上海交通大学医学院附属仁济医院'
                    }
                  }
                },
                {
                  id: 'schedule-2-3',
                  type: ScheduleType.SURGERY,
                  plannedStartDateTime: new Date('2023-06-20T13:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-20T14:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'surgery-single',
                      displayName: '单画面手术',
                      description: '适用于单摄像头手术直播'
                    }
                  ],
                  surgeryInfo: {
                    procedure: '心脏搭桥手术后续',
                    surgeons: [
                      {
                        name: '李医生',
                        title: '主任医师',
                        organization: '上海交通大学医学院附属仁济医院'
                      }
                    ]
                  }
                }
              ],
              streamConfig: {
                bitrate: 4000,
                resolution: '1920x1080',
                fps: 30,
                codec: 'h264_nvenc',
                preset: 'zerolatency',
                streamUrl: 'rtmp://live.example.com/channel1/main',
                streamSecret: 'live_secret_key_456'
              }
            },
            {
              id: 'branch-2-2',
              name: '分会场',
              schedules: [
                {
                  id: 'schedule-2-4',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-20T10:00:00'),
                  plannedDuration: 120,
                  plannedEndDateTime: new Date('2023-06-20T12:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-with-slides',
                      displayName: '讲座带幻灯片',
                      description: '适用于带幻灯片的讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '心脏疾病的预防与治疗',
                    speaker: {
                      name: '陈教授',
                      title: '教授',
                      organization: '上海交通大学医学院'
                    }
                  }
                },
                {
                  id: 'schedule-2-5',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-20T12:00:00'),
                  plannedDuration: 120,
                  plannedEndDateTime: new Date('2023-06-20T14:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-with-slides',
                      displayName: '讲座带幻灯片',
                      description: '适用于带幻灯片的讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '心脏手术后的康复指导',
                    speaker: {
                      name: '王教授',
                      title: '副教授',
                      organization: '上海交通大学医学院'
                    }
                  }
                }
              ],
              streamConfig: {
                bitrate: 3000,
                resolution: '1280x720',
                fps: 30,
                codec: 'h264_nvenc',
                preset: 'zerolatency',
                streamUrl: 'rtmp://live.example.com/channel1/sub',
                streamSecret: 'live_secret_key_789'
              }
            }
          ]
        }
      ]
    },
    {
      id: 'channel-2',
      name: '教育频道',
      url: 'https://example.com/channel/2',
      plans: [
        {
          id: 'plan-3',
          name: '医学教育讲座',
          plannedStartDateTime: new Date('2023-06-18T14:00:00'),
          plannedEndDateTime: new Date('2023-06-18T16:00:00'),
          cover: 'https://example.com/covers/lecture.jpg',
          background: 'https://example.com/backgrounds/green.jpg',
          labelBackground: 'https://example.com/backgrounds/label-green.png',
          textColor: '#333333',
          branches: [
            {
              id: 'branch-3-1',
              name: '主会场',
              schedules: [
                {
                  id: 'schedule-3-1',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-18T14:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-18T15:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-single',
                      displayName: '单画面讲座',
                      description: '适用于单摄像头讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '现代医学教育的发展趋势',
                    speaker: {
                      name: '赵教授',
                      title: '教授',
                      organization: '北京大学医学部'
                    }
                  }
                },
                {
                  id: 'schedule-3-2',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-18T15:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-18T16:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-with-slides',
                      displayName: '讲座带幻灯片',
                      description: '适用于带幻灯片的讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '医学教育改革与创新',
                    speaker: {
                      name: '钱教授',
                      title: '教授',
                      organization: '北京大学医学部'
                    }
                  }
                }
              ],
              streamConfig: {
                bitrate: 2000,
                resolution: '1280x720',
                fps: 30,
                codec: 'h264_nvenc',
                preset: 'performance',
                streamUrl: 'rtmp://live.example.com/channel2/main',
                streamSecret: 'live_secret_key_abc'
              }
            },
            {
              id: 'branch-3-2',
              name: '分会场A',
              schedules: [
                {
                  id: 'schedule-3-3',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-18T14:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-18T15:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-with-slides',
                      displayName: '讲座带幻灯片',
                      description: '适用于带幻灯片的讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '临床医学教育方法创新',
                    speaker: {
                      name: '孙教授',
                      title: '教授',
                      organization: '北京协和医院'
                    }
                  }
                },
                {
                  id: 'schedule-3-4',
                  type: ScheduleType.SURGERY,
                  plannedStartDateTime: new Date('2023-06-18T15:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-18T16:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'surgery-single',
                      displayName: '单画面手术',
                      description: '适用于单摄像头手术直播'
                    }
                  ],
                  surgeryInfo: {
                    procedure: '微创手术示范',
                    surgeons: [
                      {
                        name: '周医生',
                        title: '主任医师',
                        organization: '北京协和医院'
                      }
                    ]
                  }
                }
              ],
              streamConfig: {
                bitrate: 2000,
                resolution: '1280x720',
                fps: 30,
                codec: 'h264_nvenc',
                preset: 'performance',
                streamUrl: 'rtmp://live.example.com/channel2/sub-a',
                streamSecret: 'live_secret_key_def'
              }
            },
            {
              id: 'branch-3-3',
              name: '分会场B',
              schedules: [
                {
                  id: 'schedule-3-5',
                  type: ScheduleType.SURGERY,
                  plannedStartDateTime: new Date('2023-06-18T14:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-18T15:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'surgery-double',
                      displayName: '双画面手术',
                      description: '适用于双摄像头手术直播'
                    }
                  ],
                  surgeryInfo: {
                    procedure: '腹腔镜手术示范',
                    surgeons: [
                      {
                        name: '吴医生',
                        title: '主任医师',
                        organization: '上海瑞金医院'
                      }
                    ]
                  }
                },
                {
                  id: 'schedule-3-6',
                  type: ScheduleType.LECTURE,
                  plannedStartDateTime: new Date('2023-06-18T15:00:00'),
                  plannedDuration: 60,
                  plannedEndDateTime: new Date('2023-06-18T16:00:00'),
                  layouts: [
                    {
                      id: 1,
                      template: 'lecture-single',
                      displayName: '单画面讲座',
                      description: '适用于单摄像头讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '腹腔镜手术技术进展',
                    speaker: {
                      name: '吴医生',
                      title: '主任医师',
                      organization: '上海瑞金医院'
                    }
                  }
                }
              ],
              streamConfig: {
                bitrate: 2000,
                resolution: '1280x720',
                fps: 30,
                codec: 'h264_nvenc',
                preset: 'performance',
                streamUrl: 'rtmp://live.example.com/channel2/sub-b',
                streamSecret: 'live_secret_key_ghi'
              }
            }
          ]
        }
      ]
    }
  ];

  // 新增：一次性获取所有频道、计划和分支数据的接口
  Mock.mock('/api/plan/all', 'get', () => {
    return {
      code: 0,
      data: mockChannels,
      message: '获取所有数据成功'
    }
  });

  // 保留原有接口，但使用统一的数据源
  // 获取频道列表接口
  Mock.mock('/api/plan/channels', 'get', () => {
    // 返回频道列表，但不包含plans字段的内容
    const channelsWithoutPlans = mockChannels.map(channel => ({
      id: channel.id,
      name: channel.name,
      url: channel.url,
      plans: []
    }));
    
    return {
      code: 0,
      data: channelsWithoutPlans,
      message: '获取频道列表成功'
    }
  })
  
  // 获取计划列表接口
  Mock.mock(new RegExp('/api/plan/plans(\\?.*)?$'), 'get', (options) => {
    // 解析查询参数
    const url = options.url
    const channelId = url.match(/channelId=([^&]+)/)?.[1]
    
    if (!channelId) {
      return {
        code: 1001,
        data: null,
        message: '缺少频道ID'
      }
    }
    
    // 根据频道ID返回不同的计划列表
    const channel = mockChannels.find(c => c.id === channelId);
    if (!channel) {
      return {
        code: 1002,
        data: [],
        message: '频道不存在'
      }
    }
    
    // 返回计划列表，但不包含branches字段的内容
    const plansWithoutBranches = channel.plans.map(plan => {
      const { branches, ...planWithoutBranches } = plan;
      return planWithoutBranches;
    });
    
    return {
      code: 0,
      data: plansWithoutBranches,
      message: '获取计划列表成功'
    }
  })
  
  // 获取计划详情接口
  Mock.mock(new RegExp('/api/plan/plans/([^/]+)$'), 'get', (options) => {
    // 解析路径参数
    const planId = options.url.match(/\/api\/plan\/plans\/([^/]+)$/)?.[1]
    
    if (!planId) {
      return {
        code: 1001,
        data: null,
        message: '缺少计划ID'
      }
    }
    
    // 查找计划
    let plan: Plan | null = null;
    for (const channel of mockChannels) {
      const foundPlan = channel.plans.find(p => p.id === planId);
      if (foundPlan) {
        plan = foundPlan;
        break;
      }
    }
    
    if (!plan) {
      return {
        code: 1002,
        data: null,
        message: '计划不存在'
      }
    }
    
    return {
      code: 0,
      data: plan,
      message: '获取计划详情成功'
    }
  })
  
  // 获取分支列表接口
  Mock.mock(new RegExp('/api/plan/branches(\\?.*)?$'), 'get', (options) => {
    // 解析查询参数
    const url = options.url
    const planId = url.match(/planId=([^&]+)/)?.[1]
    
    if (!planId) {
      return {
        code: 1001,
        data: null,
        message: '缺少计划ID'
      }
    }
    
    // 查找计划
    let branches: Branch[] = [];
    for (const channel of mockChannels) {
      const plan = channel.plans.find(p => p.id === planId);
      if (plan && plan.branches) {
        branches = plan.branches;
        break;
      }
    }
    
    return {
      code: 0,
      data: branches,
      message: '获取分支列表成功'
    }
  })
  
  // 获取分支详情接口
  Mock.mock(new RegExp('/api/plan/branches/([^/]+)$'), 'get', (options) => {
    // 解析路径参数
    const branchId = options.url.match(/\/api\/plan\/branches\/([^/]+)$/)?.[1]
    
    if (!branchId) {
      return {
        code: 1001,
        data: null,
        message: '缺少分支ID'
      }
    }
    
    // 查找分支
    let branch: Branch | null = null;
    for (const channel of mockChannels) {
      for (const plan of channel.plans) {
        if (plan.branches) {
          const foundBranch = plan.branches.find(b => b.id === branchId);
          if (foundBranch) {
            branch = foundBranch;
            break;
          }
        }
      }
      if (branch) break;
    }
    
    if (!branch) {
      return {
        code: 1002,
        data: null,
        message: '分支不存在'
      }
    }
    
    return {
      code: 0,
      data: branch,
      message: '获取分支详情成功'
    }
  })
} 