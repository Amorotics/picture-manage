<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="modal-overlay"
        @click="handleOverlayClick"
      >
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            class="modal-content max-w-2xl"
            @click.stop
          >
            <!-- 头部 -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
                创建分享链接
              </h2>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                @click="close"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
            
            <!-- 内容 -->
            <div class="p-6">
              <!-- 分享预览 -->
              <div class="mb-6">
                <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  分享内容
                </h3>
                
                <div v-if="shareType === 'single' && image" class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <img
                    :src="getThumbnailUrl(image)"
                    :alt="image.filename"
                    class="w-12 h-12 rounded object-cover"
                    @error="(event) => handleImageError(event, image)"
                  />
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ image.filename }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatFileSize(image.size) }} • {{ image.width }}×{{ image.height }}
                    </p>
                  </div>
                </div>
                
                <div v-else-if="images && images.length > 0" class="space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-gray-900 dark:text-gray-100">
                      {{ images.length }} 张图片
                    </span>
                    <span class="text-gray-500 dark:text-gray-400">
                      总大小: {{ formatFileSize(totalSize) }}
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-6 gap-2">
                    <img
                      v-for="(img, index) in images.slice(0, 6)"
                      :key="img.id"
                      :src="getThumbnailUrl(img)"
                      :alt="img.filename"
                      class="w-full aspect-square rounded object-cover"
                      @error="(event) => handleImageError(event, img)"
                    />
                    <div
                      v-if="images.length > 6"
                      class="w-full aspect-square rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400"
                    >
                      +{{ images.length - 6 }}
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 分享设置表单 -->
              <form @submit.prevent="createShare" class="space-y-4">
                <!-- 分享类型 -->
                <div v-if="images && images.length > 1">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    分享类型
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <label class="relative flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input
                        v-model="shareType"
                        type="radio"
                        value="batch"
                        class="sr-only"
                      />
                      <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center"
                             :class="shareType === 'batch' ? 'border-primary-600 bg-primary-600' : ''">
                          <div v-if="shareType === 'batch'" class="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">批量下载</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">打包下载所有图片</div>
                        </div>
                      </div>
                    </label>
                    
                    <label class="relative flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input
                        v-model="shareType"
                        type="radio"
                        value="gallery"
                        class="sr-only"
                      />
                      <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center"
                             :class="shareType === 'gallery' ? 'border-primary-600 bg-primary-600' : ''">
                          <div v-if="shareType === 'gallery'" class="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <div>
                          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">图片画廊</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">在线浏览图片</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <!-- 标题 -->
                <div>
                  <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    分享标题
                  </label>
                  <input
                    id="title"
                    v-model="form.title"
                    type="text"
                    class="input"
                    :placeholder="defaultTitle"
                  />
                </div>
                
                <!-- 描述 -->
                <div>
                  <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述 (可选)
                  </label>
                  <textarea
                    id="description"
                    v-model="form.description"
                    rows="3"
                    class="input"
                    placeholder="添加一些描述信息..."
                  ></textarea>
                </div>
                
                <!-- 访问控制 -->
                <div class="space-y-3">
                  <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">访问控制</h4>
                  
                  <!-- 密码保护 -->
                  <div class="flex items-start space-x-3">
                    <input
                      id="password-protection"
                      v-model="form.enablePassword"
                      type="checkbox"
                      class="mt-1 w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div class="flex-1">
                      <label for="password-protection" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        密码保护
                      </label>
                      <input
                        v-if="form.enablePassword"
                        v-model="form.password"
                        type="password"
                        class="input mt-2"
                        placeholder="设置访问密码"
                      />
                    </div>
                  </div>
                  
                  <!-- 过期时间 -->
                  <div class="flex items-start space-x-3">
                    <input
                      id="expiration"
                      v-model="form.enableExpiration"
                      type="checkbox"
                      class="mt-1 w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div class="flex-1">
                      <label for="expiration" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        设置过期时间
                      </label>
                      <select
                        v-if="form.enableExpiration"
                        v-model="form.expiresIn"
                        class="input mt-2"
                      >
                        <option value="1">1小时后</option>
                        <option value="24">1天后</option>
                        <option value="168">1周后</option>
                        <option value="720">1个月后</option>
                        <option value="8760">1年后</option>
                      </select>
                    </div>
                  </div>
                  
                  <!-- 访问次数限制 -->
                  <div class="flex items-start space-x-3">
                    <input
                      id="view-limit"
                      v-model="form.enableViewLimit"
                      type="checkbox"
                      class="mt-1 w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div class="flex-1">
                      <label for="view-limit" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        限制访问次数
                      </label>
                      <input
                        v-if="form.enableViewLimit"
                        v-model.number="form.maxViews"
                        type="number"
                        min="1"
                        max="1000"
                        class="input mt-2"
                        placeholder="最大访问次数"
                      />
                    </div>
                  </div>
                  
                  <!-- 允许下载 -->
                  <div class="flex items-center space-x-3">
                    <input
                      id="allow-download"
                      v-model="form.allowDownload"
                      type="checkbox"
                      class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label for="allow-download" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      允许下载
                    </label>
                  </div>
                </div>
              </form>
            </div>
            
            <!-- 底部按钮 -->
            <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                class="btn btn-secondary"
                @click="close"
              >
                取消
              </button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="isCreating"
                @click="createShare"
              >
                <div v-if="isCreating" class="loading-spinner w-4 h-4 mr-2"></div>
                {{ isCreating ? '创建中...' : '创建分享链接' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { shareAPI } from '@/services/api'
import type { Image, ShareCreateOptions } from '@/types'

// Props
interface Props {
  isOpen: boolean
  image?: Image
  images?: Image[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
  success: [shareLink: any]
  error: [error: string]
}>()

// Reactive data
const isCreating = ref(false)
const shareType = ref<'single' | 'batch' | 'gallery'>('single')

const form = ref({
  title: '',
  description: '',
  enablePassword: false,
  password: '',
  enableExpiration: false,
  expiresIn: 24,
  enableViewLimit: false,
  maxViews: 100,
  allowDownload: true
})

// Computed
const defaultTitle = computed(() => {
  if (props.image) {
    return props.image.filename
  }
  if (props.images && props.images.length > 0) {
    return `${props.images.length}张图片`
  }
  return '分享'
})

const totalSize = computed(() => {
  if (!props.images) return 0
  return props.images.reduce((total, img) => total + img.size, 0)
})

// Watch
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetForm()
    if (props.image) {
      shareType.value = 'single'
    } else if (props.images && props.images.length > 1) {
      shareType.value = 'gallery'
    }
  }
})

// Methods
const close = () => {
  emit('close')
}

const handleOverlayClick = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

const resetForm = () => {
  form.value = {
    title: '',
    description: '',
    enablePassword: false,
    password: '',
    enableExpiration: false,
    expiresIn: 24,
    enableViewLimit: false,
    maxViews: 100,
    allowDownload: true
  }
}

const createShare = async () => {
  try {
    isCreating.value = true
    
    const shareData: ShareCreateOptions = {
      shareType: shareType.value,
      title: form.value.title || defaultTitle.value,
      description: form.value.description || undefined,
      password: form.value.enablePassword ? form.value.password : undefined,
      expiresIn: form.value.enableExpiration ? form.value.expiresIn : undefined,
      maxViews: form.value.enableViewLimit ? form.value.maxViews : undefined,
      allowDownload: form.value.allowDownload
    }
    
    if (shareType.value === 'single' && props.image) {
      shareData.imageId = props.image.id
    } else if (props.images && props.images.length > 0) {
      shareData.imageIds = props.images.map(img => img.id)
    }
    
    const response = await shareAPI.createShare(shareData)
    
    if (response.success) {
      emit('success', response.data)
      close()
    } else {
      throw new Error(response.message || '创建分享链接失败')
    }
  } catch (error) {
    emit('error', error instanceof Error ? error.message : '创建分享链接失败')
  } finally {
    isCreating.value = false
  }
}

const getThumbnailUrl = (image: Image): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  if (image.thumbnail_path) {
    // 处理缩略图路径 - 可能是完整路径或只是文件名
    let thumbnailFilename = image.thumbnail_path
    if (thumbnailFilename.includes('/')) {
      // 如果是完整路径，提取文件名
      thumbnailFilename = thumbnailFilename.split('/').pop() || thumbnailFilename
    }
    return `${baseUrl}/uploads/${thumbnailFilename}`
  }
  return `${baseUrl}/uploads/${image.stored_filename}`
}

const getImageUrl = (image: Image): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  return `${baseUrl}/uploads/${image.stored_filename}`
}

const handleImageError = (event: Event, image: Image) => {
  const img = event.target as HTMLImageElement
  // 如果缩略图加载失败，尝试加载原图
  if (img.src.includes('_thumb')) {
    img.src = getImageUrl(image)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>
