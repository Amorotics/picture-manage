// 图片相关类型
export interface Image {
  id: string
  filename: string
  stored_filename: string
  mime_type: string
  size: number
  width: number
  height: number
  path: string
  thumbnail_path?: string
  description?: string
  tags: string[]
  metadata: {
    format: string
    density?: number
    hasAlpha?: boolean
    orientation?: number
    exif?: any
  }
  is_public: boolean
  view_count: number
  download_count: number
  created_at: string
  updated_at: string
}

// 分页信息
export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

// 图片列表响应
export interface ImageListResponse {
  success: boolean
  data: {
    images: Image[]
    pagination: Pagination
  }
}

// 图片上传响应
export interface ImageUploadResponse {
  success: boolean
  data: {
    uploaded: Image[]
    errors: Array<{
      filename: string
      error: string
    }>
  }
  message: string
}

// 分享链接类型
export interface ShareLink {
  id: string
  token: string
  shareUrl: string
  shareType: 'single' | 'batch' | 'gallery'
  title: string
  description?: string
  hasPassword: boolean
  expiresAt?: string
  maxViews?: number
  allowDownload: boolean
  imageCount: number
  viewCount: number
  downloadCount: number
  createdAt: string
}

// 分享信息
export interface ShareInfo {
  id: string
  title: string
  description?: string
  shareType: 'single' | 'batch' | 'gallery'
  allowDownload: boolean
  viewCount: number
  downloadCount: number
  createdAt: string
}

// 分享访问响应
export interface ShareAccessResponse {
  success: boolean
  data: {
    shareInfo: ShareInfo
    images: Image[]
  }
}

// 上传进度
export interface UploadProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  result?: Image
}

// 文件验证结果
export interface FileValidation {
  isValid: boolean
  error?: string
  file: File
}

// 图片过滤选项
export interface ImageFilters {
  search?: string
  mimeType?: string
  sortBy?: 'created_at' | 'filename' | 'size' | 'view_count' | 'download_count'
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  limit?: number
}

// 分享创建选项
export interface ShareCreateOptions {
  imageId?: string
  imageIds?: string[]
  shareType?: 'single' | 'batch' | 'gallery'
  title?: string
  description?: string
  password?: string
  expiresIn?: number // 小时
  maxViews?: number
  allowDownload?: boolean
}

// 模态框状态
export interface ModalState {
  isOpen: boolean
  image?: Image
  images?: Image[]
  currentIndex?: number
}

// 通知类型
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
  }>
}

// 主题类型
export type Theme = 'light' | 'dark' | 'system'

// 视图模式
export type ViewMode = 'grid' | 'list' | 'masonry'

// 排序选项
export interface SortOption {
  value: string
  label: string
  order: 'ASC' | 'DESC'
}

// 应用状态
export interface AppState {
  theme: Theme
  viewMode: ViewMode
  sidebarOpen: boolean
  loading: boolean
  notifications: Notification[]
}

// API 响应基础类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 错误类型
export interface ApiError {
  message: string
  status?: number
  code?: string
}

// 组件 Props 类型
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// 按钮变体
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'

// 按钮尺寸
export type ButtonSize = 'sm' | 'md' | 'lg'

// 输入框类型
export type InputType = 'text' | 'email' | 'password' | 'number' | 'url' | 'search'

// 表单字段状态
export interface FieldState {
  value: any
  error?: string
  touched: boolean
  dirty: boolean
}

// 拖放状态
export interface DropState {
  isDragOver: boolean
  isDragActive: boolean
  files: File[]
}
