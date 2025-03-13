```TypeScript

// 直播计划
export interface Plan {
  id: string                // 直播计划的ID，来自于API
  cover?: string            // 计划的封面图url
  channel: string           // 当前计划所属的频道ID
  branches?: string[]       // 计划可能包含多个分支，每个分支有唯一id
  name: string              // 计划的名称
  plannedStartDateTime: Date // 预计开始时间
  plannedEndDateTime?: Date  // 预计结束时间
  schedules?: Schedule[] // 计划包含的日程
  background?: string  // 计划内所有布局通用的背景图片url，除非layout单独指定该字段
  labelBackground?: string // 计划内所有布局通用的标签背景图片url，除非layout单独指定该字段
  textColor?: string    // 计划内所有布局通用的文字颜色，除非laytou单独指定该字段
  streamConfig?: StreamConfig   // 直播计划的推流配置，通过API进行远程预设值
}

// 推流配置
export interface StreamConfig {
  bitrate?: number       // 视频码率(kbps)
  resolution?: string    // 视频分辨率(例如: "1920x1080")
  fps?: number          // 帧率
  codec?: string        // 编码器类型
  preset?: "performance" | "zerolatency" // 高画质/低时延
  streamUrl?: string        // 推流地址
  streamSecret?: string     // 推流密钥
}

// 日程
export interface Schedule {
  id: string                    // 日程在计划中的唯一id
  branch?: string               // 一个直播计划可能包含多个分支，每个日程可能处于不同的分支
  type: ScheduleType            // 日程类型，目前支持手术演示/讲课
  plannedStartDateTime?: Date   // 预计开始时间
  plannedDuration?: number      // 预计持续时间（分钟）
  plannedEndDateTime?: Date     // 预计结束时间（根据前二者计算得到）
  layouts: Layout[]             // 日程重可以包含多个布局（Layout）
  surgeryInfo?: SurgeryInfo     // 手术演示类日程的手术信息
  lectureInfo?: LectureInfo     // 讲课类日程的讲课信息
}

// 手术信息
export interface SurgeryInfo {
  procedure: string             // 术式名
  surgeons: PersonInfo[]        // 术者列表
  guests?: PersonInfo[]          // 嘉宾列表
}

// 讲课信息
export interface LectureInfo {
  topic: string                 // 讲课主题
  speaker: PersonInfo           // 讲者
}

// 人员信息
export interface PersonInfo {
  name: string                  // 人员姓名
  title?: string                 // 人员职称
  organization: string          // 人员所在单位名称（医院/研究机构/出版社等等）
}

export interface Layout {
    id: number                      // 该布局在当前schedule中的id，多个布局顺序排列不重复即可
    mode: string                // 该布局的模式（我们约定所有布局模式名称唯一）
    layoutName?: string            // 该布局的显示名字（暂存于此，方便调用）
    layoutDescription?: string     // 该布局的用途描述
}

export interface LayoutSchema {
    mode: string                    // 布局的唯一识别模式名
    elements?: LayoutElement[]      // 该布局包含的布局元素（一个布局内包含多个布局元素）
    background?: string             // 布局背景图url
    foreground?: string             // 布局前景图url
    labelBackground?: string        // 布局的标签背景图片url
    textColor?: string              // 布局内文字颜色
}

export interface LayoutElement {
    id?: number                  // 该媒体元素在所在布局的出现顺序号
    x: number                   // 元素x坐标（左上角为原点，下同）
    y: number                   // 元素y坐标
    width: number               // 元素宽度（单位为px）
    height: number              // 元素高度
    zIndex?: number             // 元素zindex
    type: LayoutElementType
    mediaElementSourceId?: string // 如果是media类型的element用来存储媒体源id
    mediaElementSourceName?: string // 如果是media类型的element用来存储媒体源名称
    transparentBackground?:boolean // 如果是media类型的element true:元素背景透明 false：元素黑色背景
}

export enum LayoutElementType {
    MEDIA = 'media'
    HOST_LABEL = 'host-label',
    HOST_INFO = 'host-info',
    SUBJECT_LABEL = 'subject-label',
    SUBJECT_INFO = 'subject-info',
    GUEST_LABEL = 'guest-label',
    GUEST_INFO = 'guest-info',
}

 ```