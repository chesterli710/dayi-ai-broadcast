/**
 * 计划相关 Mock 数据
 * 注意：所有接口都需要鉴权，请求时会自动携带Authorization头
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
          cover: 'https://picsum.photos/id/237/400/225',
          background: 'https://picsum.photos/id/1/1920/1080',
          labelBackground: 'https://picsum.photos/id/20/400/100',
          textColor: '#ffffff',
          surgeonLabelDisplayName: '手术团队',
          surgeryLabelDisplayName: '手术名称',
          speakerLabelDisplayName: '主讲人',
          subjectLabelDisplayName: '讲座主题',
          guestLabelDisplayName: '特邀嘉宾',
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
                      template: 'fullscreen',
                      description: '全屏手术直播'
                    },
                    {
                      id: 2,
                      template: '1s1b',
                      description: '一小一大布局'
                    },
                    {
                      id: 3,
                      template: '2s1b',
                      description: '二小一大布局'
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
                      template: 'fullscreen',
                      description: '全屏讲座直播'
                    },
                    {
                      id: 2,
                      template: '2es',
                      description: '二等分布局'
                    }
                  ],
                  lectureInfo: {
                    topic: '肝胆管结石手术后的护理',
                    speakers: [
                      {
                        name: '王教授',
                        title: '教授',
                        organization: '北京协和医院'
                      }
                    ],
                    guests: []
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
          cover: 'https://picsum.photos/id/239/400/225',
          surgeonLabelDisplayName: '术者团队',
          surgeryLabelDisplayName: '术式',
          speakerLabelDisplayName: '讲解专家',
          subjectLabelDisplayName: '演讲主题',
          background: 'https://picsum.photos/id/12/1920/1080',
          guestLabelDisplayName: '互动嘉宾',
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
                      template: '2es',
                      description: '二等分布局'
                    },
                    {
                      id: 2,
                      template: 'fullscreen',
                      description: '全屏手术直播'
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
                      template: 'fullscreen',
                      description: '全屏讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '心脏搭桥手术技术进展',
                    speakers: [
                      {
                        name: '李教授',
                        title: '教授',
                        organization: '上海交通大学医学院附属仁济医院'
                      }
                    ],
                    guests: []
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
                      template: 'fullscreen',
                      description: '全屏手术直播'
                    },
                    {
                      id: 2,
                      template: '1s1b',
                      description: '一小一大布局'
                    },
                    {
                      id: 3,
                      template: '2s1b',
                      description: '二小一大布局'
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
                      template: '1s1b',
                      description: '一小一大布局'
                    },
                    {
                      id: 2,
                      template: '2es',
                      description: '二等分布局'
                    }
                  ],
                  lectureInfo: {
                    topic: '心脏疾病的预防与治疗',
                    speakers: [
                      {
                        name: '陈教授',
                        title: '教授',
                        organization: '上海交通大学医学院'
                      }
                    ],
                    guests: []
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
                      template: '2s1b',
                      description: '二小一大布局'
                    },
                    {
                      id: 2,
                      template: 'fullscreen',
                      description: '全屏讲座直播'
                    }
                  ],
                  lectureInfo: {
                    topic: '心脏手术后的康复指导',
                    speakers: [
                      {
                        name: '王教授',
                        title: '副教授',
                        organization: '上海交通大学医学院'
                      }
                    ],
                    guests: []
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
          cover: 'https://picsum.photos/id/250/400/225',
          background: 'https://picsum.photos/id/3/1920/1080',
          labelBackground: 'https://picsum.photos/id/22/400/100',
          textColor: '#333333',
          surgeonLabelDisplayName: '主讲专家',
          surgeryLabelDisplayName: '讲座主题',
          speakerLabelDisplayName: '讲师',
          subjectLabelDisplayName: '课程主题',
          guestLabelDisplayName: '参与嘉宾',
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
                      template: 'fullscreen',
                      description: '全屏讲座直播',
                      background: 'https://picsum.photos/id/18/1920/1080'
                    },
                    {
                      id: 2,
                      template: '1s1b',
                      description: '一小一大布局',
                      background: 'https://picsum.photos/id/19/1920/1080'
                    },
                    {
                      id: 3,
                      template: '2es',
                      description: '二等分布局',
                      background: 'https://picsum.photos/id/20/1920/1080'
                    }
                  ],
                  lectureInfo: {
                    topic: '现代医学教育的发展趋势',
                    speakers: [
                      {
                        name: '赵教授',
                        title: '教授',
                        organization: '北京大学医学部'
                      }
                    ],
                    guests: []
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
                      template: '2s1b',
                      description: '二小一大布局',
                      background: 'https://picsum.photos/id/19/1920/1080'
                    },
                    {
                      id: 2,
                      template: '2es',
                      description: '二等分布局',
                      background: 'https://picsum.photos/id/21/1920/1080'
                    }
                  ],
                  lectureInfo: {
                    topic: '医学教育改革与创新',
                    speakers: [
                      {
                        name: '钱教授',
                        title: '教授',
                        organization: '北京大学医学部'
                      }
                    ],
                    guests: []
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
                      template: '2s1b',
                      description: '二小一大布局',
                      background: 'https://picsum.photos/id/24/1920/1080'
                    },
                    {
                      id: 2,
                      template: 'fullscreen',
                      description: '全屏讲座直播',
                      background: 'https://picsum.photos/id/25/1920/1080'
                    }
                  ],
                  lectureInfo: {
                    topic: '临床医学教育方法创新',
                    speakers: [
                      {
                        name: '孙教授',
                        title: '教授',
                        organization: '北京协和医院'
                      }
                    ],
                    guests: []
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
                      template: 'fullscreen',
                      description: '全屏手术直播',
                      background: 'https://picsum.photos/id/21/1920/1080'
                    },
                    {
                      id: 2,
                      template: '1s1b',
                      description: '一小一大布局',
                      background: 'https://picsum.photos/id/22/1920/1080'
                    },
                    {
                      id: 3,
                      template: '2es',
                      description: '二等分布局',
                      background: 'https://picsum.photos/id/23/1920/1080'
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
                      template: '2es',
                      description: '二等分布局',
                      background: 'https://picsum.photos/id/23/1920/1080'
                    },
                    {
                      id: 2,
                      template: '2s1b',
                      description: '二小一大布局',
                      background: 'https://picsum.photos/id/24/1920/1080'
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
                      template: 'fullscreen',
                      description: '全屏讲座直播',
                      background: 'https://picsum.photos/id/15/1920/1080'
                    },
                    {
                      id: 2,
                      template: '1s1b',
                      description: '一小一大布局',
                      background: 'https://picsum.photos/id/16/1920/1080'
                    },
                    {
                      id: 3,
                      template: '2s1b',
                      description: '二小一大布局',
                      background: 'https://picsum.photos/id/17/1920/1080'
                    }
                  ],
                  lectureInfo: {
                    topic: '腹腔镜手术技术进展',
                    speakers: [
                      {
                        name: '吴医生',
                        title: '主任医师',
                        organization: '上海瑞金医院'
                      }
                    ],
                    guests: []
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

  /**
   * 模拟鉴权检查函数
   * @param options Mock请求选项
   * @returns 是否通过鉴权
   */
  function checkAuth(options: any): boolean {
    // 在mock环境中，我们假设请求头中包含Authorization字段即视为已登录
    // 在实际项目中，这里应该检查token的有效性
    return true; // 在mock环境中默认通过鉴权
  }

  /**
   * 生成未授权响应
   * @returns 401未授权响应对象
   */
  function generateUnauthorizedResponse() {
    return {
      code: 401,
      data: null,
      message: '未登录或token已过期'
    };
  }

  // 新增：一次性获取当前登录用户可操作的所有频道、计划和分支数据的接口
  Mock.mock('/api/plan/all', 'get', (options) => {
    // 鉴权检查
    if (!checkAuth(options)) {
      return generateUnauthorizedResponse();
    }
    
    // 在实际应用中，这里应该根据token解析出用户ID，然后只返回该用户有权限访问的数据
    // 在mock环境中，我们假设所有已登录用户都可以访问所有数据
    return {
      code: 0,
      data: mockChannels,
      message: '获取所有数据成功'
    };
  });

  // 保留原有接口，但使用统一的数据源
  // 获取频道列表接口
  Mock.mock('/api/plan/channels', 'get', (options) => {
    // 鉴权检查
    if (!checkAuth(options)) {
      return generateUnauthorizedResponse();
    }
    
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
    // 鉴权检查
    if (!checkAuth(options)) {
      return generateUnauthorizedResponse();
    }
    
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
    // 鉴权检查
    if (!checkAuth(options)) {
      return generateUnauthorizedResponse();
    }
    
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
    // 鉴权检查
    if (!checkAuth(options)) {
      return generateUnauthorizedResponse();
    }
    
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
    // 鉴权检查
    if (!checkAuth(options)) {
      return generateUnauthorizedResponse();
    }
    
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
  
  // 保存日程（新建）
  Mock.mock(new RegExp('/api/plan/branches/([^/]+)/schedules$'), 'post', (options) => {
    try {
      // 鉴权检查
      if (!checkAuth(options)) {
        return generateUnauthorizedResponse();
      }
      
      // 解析请求参数
      const url = options.url
      const matches = url.match(/\/api\/plan\/branches\/([^/]+)\/schedules$/)
      if (!matches || !matches[1]) {
        return {
          code: 400,
          message: '无效的请求URL',
          data: null
        }
      }
      
      const branchId = matches[1]
      const body = JSON.parse(options.body)
      
      // 查找对应的分支
      const branch = findBranchById(branchId)
      if (!branch) {
        return {
          code: 404,
          message: '分支不存在',
          data: null
        }
      }
      
      // 生成新的ID（确保唯一性）
      const newId = `schedule-${Date.now()}`
      
      // 创建新的日程对象
      const newSchedule: Schedule = {
        ...body,
        id: newId
      }
      
      // 添加到分支的日程列表中
      branch.schedules.push(newSchedule)
      
      // 返回成功响应
      return {
        code: 0,
        message: '保存日程成功',
        data: newSchedule
      }
    } catch (error) {
      console.error('Mock保存日程失败:', error)
      return {
        code: 500,
        message: '保存日程失败',
        data: null
      }
    }
  })
  
  // 保存日程（更新）
  Mock.mock(new RegExp('/api/plan/branches/([^/]+)/schedules/([^/]+)$'), 'put', (options) => {
    try {
      // 鉴权检查
      if (!checkAuth(options)) {
        return generateUnauthorizedResponse();
      }
      
      // 解析请求参数
      const url = options.url
      const matches = url.match(/\/api\/plan\/branches\/([^/]+)\/schedules\/([^/]+)$/)
      if (!matches || !matches[1] || !matches[2]) {
        return {
          code: 400,
          message: '无效的请求URL',
          data: null
        }
      }
      
      const branchId = matches[1]
      const scheduleId = matches[2]
      const body = JSON.parse(options.body)
      
      // 查找对应的分支
      const branch = findBranchById(branchId)
      if (!branch) {
        return {
          code: 404,
          message: '分支不存在',
          data: null
        }
      }
      
      // 查找对应的日程
      const scheduleIndex = branch.schedules.findIndex(s => s.id === scheduleId)
      if (scheduleIndex === -1) {
        return {
          code: 404,
          message: '日程不存在',
          data: null
        }
      }
      
      // 更新日程
      const updatedSchedule: Schedule = {
        ...body,
        id: scheduleId // 确保ID不变
      }
      
      // 替换原有日程
      branch.schedules[scheduleIndex] = updatedSchedule
      
      // 返回成功响应
      return {
        code: 0,
        message: '更新日程成功',
        data: updatedSchedule
      }
    } catch (error) {
      console.error('Mock更新日程失败:', error)
      return {
        code: 500,
        message: '更新日程失败',
        data: null
      }
    }
  })
  
  // 删除日程
  Mock.mock(new RegExp('/api/plan/branches/([^/]+)/schedules/([^/]+)$'), 'delete', (options) => {
    try {
      // 鉴权检查
      if (!checkAuth(options)) {
        return generateUnauthorizedResponse();
      }
      
      // 解析请求参数
      const url = options.url
      const matches = url.match(/\/api\/plan\/branches\/([^/]+)\/schedules\/([^/]+)$/)
      if (!matches || !matches[1] || !matches[2]) {
        return {
          code: 400,
          message: '无效的请求URL',
          data: null
        }
      }
      
      const branchId = matches[1]
      const scheduleId = matches[2]
      
      // 查找对应的分支
      const branch = findBranchById(branchId)
      if (!branch) {
        return {
          code: 404,
          message: '分支不存在',
          data: null
        }
      }
      
      // 查找对应的日程
      const scheduleIndex = branch.schedules.findIndex(s => s.id === scheduleId)
      if (scheduleIndex === -1) {
        return {
          code: 404,
          message: '日程不存在',
          data: null
        }
      }
      
      // 删除日程
      branch.schedules.splice(scheduleIndex, 1)
      
      // 返回成功响应
      return {
        code: 0,
        message: '删除日程成功',
        data: null
      }
    } catch (error) {
      console.error('Mock删除日程失败:', error)
      return {
        code: 500,
        message: '删除日程失败',
        data: null
      }
    }
  })
  
  /**
   * 根据ID查找分支
   * @param branchId 分支ID
   * @returns 找到的分支或undefined
   */
  function findBranchById(branchId: string): Branch | undefined {
    for (const channel of mockChannels) {
      for (const plan of channel.plans) {
        const branch = plan.branches?.find(b => b.id === branchId)
        if (branch) {
          return branch
        }
      }
    }
    return undefined
  }
} 