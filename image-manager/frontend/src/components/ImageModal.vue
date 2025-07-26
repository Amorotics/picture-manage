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
        @keydown.esc="close"
        tabindex="0"
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
            class="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden"
            @click.stop
          >
            <!-- 头部工具栏 -->
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center space-x-4">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {{ currentImage?.filename }}
                </h2>
                
                <div class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                  <span>{{ formatFileSize(currentImage?.size || 0) }}</span>
                  <span>•</span>
                  <span>{{ currentImage?.width }}×{{ currentImage?.height }}</span>
                  <span>•</span>
                  <span>{{ formatDate(currentImage?.created_at) }}</span>
                </div>
              </div>
              
              <div class="flex items-center space-x-2">
                <!-- 导航按钮 -->
                <div v-if="images && images.length > 1" class="flex items-center space-x-1">
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    :disabled="currentIndex <= 0"
                    @click="previousImage"
                  >
                    <ChevronLeft class="w-4 h-4" />
                  </button>
                  
                  <span class="text-sm text-gray-500 dark:text-gray-400 px-2">
                    {{ currentIndex + 1 }} / {{ images.length }}
                  </span>
                  
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    :disabled="currentIndex >= images.length - 1"
                    @click="nextImage"
                  >
                    <ChevronRight class="w-4 h-4" />
                  </button>
                </div>
                
                <!-- 操作按钮 -->
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  @click="downloadImage"
                  :disabled="isDownloading"
                >
                  <Download class="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  @click="shareImage"
                >
                  <Share2 class="w-4 h-4" />
                </button>

                <button
                  type="button"
                  class="btn btn-ghost btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                  @click="deleteImage"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  @click="toggleFullscreen"
                >
                  <Maximize2 v-if="!isFullscreen" class="w-4 h-4" />
                  <Minimize2 v-else class="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  class="btn btn-ghost btn-sm"
                  @click="close"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <!-- 图片容器 -->
            <div class="relative flex-1 overflow-hidden" :class="isFullscreen ? 'h-screen' : 'h-[70vh]'">
              <div
                ref="imageContainer"
                class="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 relative overflow-hidden"
                @wheel.prevent="handleWheel"
                @mousedown="handleMouseDown"
                @mousemove="handleMouseMove"
                @mouseup="handleMouseUp"
                @mouseleave="handleMouseUp"
              >
                <!-- 加载状态 -->
                <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center">
                  <div class="loading-spinner w-8 h-8"></div>
                </div>
                
                <!-- 图片 -->
                <img
                  v-if="currentImage"
                  ref="imageElement"
                  :src="getFullImageUrl(currentImage)"
                  :alt="currentImage.filename"
                  class="max-w-none transition-transform duration-200 cursor-grab active:cursor-grabbing"
                  :style="{
                    transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
                    transformOrigin: 'center center'
                  }"
                  @load="handleImageLoad"
                  @error="handleImageError"
                  @dragstart.prevent
                />
                
                <!-- 缩放控制 -->
                <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 bg-black bg-opacity-50 rounded-lg px-3 py-2">
                  <button
                    type="button"
                    class="text-white hover:text-gray-300 transition-colors"
                    @click="zoomOut"
                    :disabled="scale <= 0.1"
                  >
                    <ZoomOut class="w-4 h-4" />
                  </button>

                  <span class="text-white text-sm min-w-[3rem] text-center">
                    {{ Math.round(scale * 100) }}%
                  </span>

                  <button
                    type="button"
                    class="text-white hover:text-gray-300 transition-colors"
                    @click="zoomIn"
                    :disabled="scale >= 5"
                  >
                    <ZoomIn class="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    class="text-white hover:text-gray-300 transition-colors ml-2"
                    @click="resetZoom"
                  >
                    <RotateCcw class="w-4 h-4" />
                  </button>
                </div>
                
                <!-- 导航箭头 -->
                <div v-if="images && images.length > 1" class="absolute inset-y-0 left-0 flex items-center">
                  <button
                    type="button"
                    class="ml-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                    :disabled="currentIndex <= 0"
                    @click="previousImage"
                  >
                    <ChevronLeft class="w-6 h-6" />
                  </button>
                </div>
                
                <div v-if="images && images.length > 1" class="absolute inset-y-0 right-0 flex items-center">
                  <button
                    type="button"
                    class="mr-4 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                    :disabled="currentIndex >= images.length - 1"
                    @click="nextImage"
                  >
                    <ChevronRight class="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
            
            <!-- 底部信息 -->
            <div v-if="currentImage" class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">基本信息</h3>
                  <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>文件名: {{ currentImage.filename }}</div>
                    <div>格式: {{ currentImage.metadata.format?.toUpperCase() }}</div>
                    <div>大小: {{ formatFileSize(currentImage.size) }}</div>
                  </div>
                </div>
                
                <div>
                  <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">图片属性</h3>
                  <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>尺寸: {{ currentImage.width }}×{{ currentImage.height }}</div>
                    <div v-if="currentImage.metadata.density">DPI: {{ currentImage.metadata.density }}</div>
                    <div v-if="currentImage.metadata.hasAlpha">透明通道: 是</div>
                  </div>
                </div>
                
                <div>
                  <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">统计信息</h3>
                  <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div>查看次数: {{ currentImage.view_count }}</div>
                    <div>下载次数: {{ currentImage.download_count }}</div>
                    <div>上传时间: {{ formatDate(currentImage.created_at) }}</div>
                  </div>
                </div>
              </div>
              
              <!-- 描述和标签 -->
              <div v-if="currentImage.description || currentImage.tags.length > 0" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div v-if="currentImage.description" class="mb-3">
                  <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">描述</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">{{ currentImage.description }}</p>
                </div>
                
                <div v-if="currentImage.tags.length > 0">
                  <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">标签</h3>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="tag in currentImage.tags"
                      :key="tag"
                      class="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs rounded-md"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import {
  X, ChevronLeft, ChevronRight, Download, Share2, Maximize2, Minimize2,
  ZoomIn, ZoomOut, RotateCcw, Trash2
} from 'lucide-vue-next'
import type { Image } from '@/types'

// Props
interface Props {
  isOpen: boolean
  image?: Image
  images?: Image[]
  currentIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentIndex: 0
})

// Emits
const emit = defineEmits<{
  close: []
  download: [image: Image]
  share: [image: Image]
  delete: [image: Image]
  navigate: [index: number]
}>()

// Refs
const imageContainer = ref<HTMLElement>()
const imageElement = ref<HTMLImageElement>()
const isLoading = ref(true)
const isDownloading = ref(false)
const isFullscreen = ref(false)

// 缩放和平移状态
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const lastMouseX = ref(0)
const lastMouseY = ref(0)

// Computed
const currentImage = computed(() => {
  if (props.images && props.images.length > 0) {
    return props.images[props.currentIndex] || props.images[0]
  }
  return props.image
})

const currentIndex = computed(() => props.currentIndex)

// Watch
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetZoom()
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    isFullscreen.value = false
  }
})

watch(() => currentImage.value, () => {
  if (currentImage.value) {
    isLoading.value = true
    resetZoom()
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

const previousImage = () => {
  if (props.images && currentIndex.value > 0) {
    emit('navigate', currentIndex.value - 1)
  }
}

const nextImage = () => {
  if (props.images && currentIndex.value < props.images.length - 1) {
    emit('navigate', currentIndex.value + 1)
  }
}

const downloadImage = () => {
  if (currentImage.value) {
    emit('download', currentImage.value)
  }
}

const shareImage = () => {
  if (currentImage.value) {
    emit('share', currentImage.value)
  }
}

const deleteImage = () => {
  if (currentImage.value) {
    emit('delete', currentImage.value)
  }
}

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

const getFullImageUrl = (image: Image): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  return `${baseUrl}/uploads/${image.stored_filename}`
}

const handleImageLoad = () => {
  isLoading.value = false
  fitToContainer()
}

const handleImageError = () => {
  isLoading.value = false
}

const fitToContainer = () => {
  if (!imageElement.value || !imageContainer.value) return
  
  const containerRect = imageContainer.value.getBoundingClientRect()
  const imageRect = imageElement.value.getBoundingClientRect()
  
  const scaleX = (containerRect.width * 0.9) / imageRect.width
  const scaleY = (containerRect.height * 0.9) / imageRect.height
  
  scale.value = Math.min(scaleX, scaleY, 1)
  panX.value = 0
  panY.value = 0
}

const resetZoom = () => {
  scale.value = 1
  panX.value = 0
  panY.value = 0
  nextTick(() => {
    fitToContainer()
  })
}

const zoomIn = () => {
  scale.value = Math.min(scale.value * 1.2, 5)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value / 1.2, 0.1)
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(5, scale.value * delta))
  
  if (newScale !== scale.value) {
    scale.value = newScale
  }
}

const handleMouseDown = (event: MouseEvent) => {
  if (scale.value > 1) {
    isDragging.value = true
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (isDragging.value) {
    const deltaX = event.clientX - lastMouseX.value
    const deltaY = event.clientY - lastMouseY.value
    
    panX.value += deltaX
    panY.value += deltaY
    
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
  }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.isOpen) return
  
  switch (event.key) {
    case 'Escape':
      close()
      break
    case 'ArrowLeft':
      previousImage()
      break
    case 'ArrowRight':
      nextImage()
      break
    case '+':
    case '=':
      zoomIn()
      break
    case '-':
      zoomOut()
      break
    case '0':
      resetZoom()
      break
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>
