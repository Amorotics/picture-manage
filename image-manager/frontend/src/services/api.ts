import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证 token
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    // 统一错误处理
    const message = error.response?.data?.message || error.message || '请求失败'
    console.error('API Error:', message)
    return Promise.reject(new Error(message))
  }
)

// 图片相关 API
export const imageAPI = {
  // 获取图片列表
  getImages: (params?: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
    search?: string
    mimeType?: string
  }) => api.get('/images', { params }),

  // 获取单张图片详情
  getImage: (id: string) => api.get(`/images/${id}`),

  // 上传图片
  uploadImages: (formData: FormData, onProgress?: (progress: number) => void) => {
    return api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  },

  // 下载单张图片
  downloadImage: (id: string) => {
    return api.get(`/images/${id}/download`, {
      responseType: 'blob',
    })
  },

  // 批量下载图片
  downloadBatch: (imageIds: string[]) => {
    return api.post('/images/download-batch', { imageIds }, {
      responseType: 'blob',
    })
  },

  // 删除图片
  deleteImage: (id: string) => api.delete(`/images/${id}`),

  // 更新图片信息
  updateImage: (id: string, data: {
    description?: string
    tags?: string[]
    is_public?: boolean
  }) => api.put(`/images/${id}`, data),
}

// 分享相关 API
export const shareAPI = {
  // 创建分享链接
  createShare: (data: {
    imageId?: string
    imageIds?: string[]
    shareType?: 'single' | 'batch' | 'gallery'
    title?: string
    description?: string
    password?: string
    expiresIn?: number
    maxViews?: number
    allowDownload?: boolean
  }) => api.post('/share', data),

  // 访问分享链接
  getShare: (token: string, password?: string) => {
    const params = password ? { password } : {}
    return api.get(`/share/${token}`, { params })
  },

  // 下载分享的图片
  downloadShare: (token: string, password?: string, imageId?: string) => {
    const params: any = {}
    if (password) params.password = password
    if (imageId) params.imageId = imageId
    
    return api.get(`/share/${token}/download`, {
      params,
      responseType: 'blob',
    })
  },

  // 获取分享链接列表
  getShares: (params?: {
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
  }) => api.get('/share', { params }),

  // 删除分享链接
  deleteShare: (id: string) => api.delete(`/share/${id}`),
}

// 工具函数
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default api
