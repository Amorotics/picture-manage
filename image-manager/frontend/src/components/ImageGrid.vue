<template>
  <div class="image-grid-container">
    <!-- 工具栏 -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div class="flex items-center space-x-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          图片库 
          <span v-if="totalImages > 0" class="text-sm font-normal text-gray-500">
            ({{ totalImages }} 张)
          </span>
        </h2>
        
        <!-- 视图切换 -->
        <div class="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            v-for="mode in viewModes"
            :key="mode.value"
            type="button"
            class="p-2 rounded-md transition-colors"
            :class="viewMode === mode.value 
              ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'"
            @click="$emit('viewModeChange', mode.value)"
          >
            <component :is="mode.icon" class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <!-- 搜索和过滤 -->
      <div class="flex items-center space-x-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索图片..."
            class="input pl-10 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            @input="handleSearch"
          />
        </div>
        
        <select
          v-model="sortBy"
          class="input w-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          @change="handleSort"
        >
          <option value="created_at">最新上传</option>
          <option value="filename">文件名</option>
          <option value="size">文件大小</option>
          <option value="view_count">查看次数</option>
          <option value="download_count">下载次数</option>
        </select>
        
        <button
          type="button"
          class="btn btn-ghost p-2"
          @click="toggleSortOrder"
        >
          <ArrowUpDown class="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <!-- 批量操作栏 -->
    <div
      v-if="selectedImages.length > 0"
      class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-blue-900 dark:text-blue-100">
          已选择 {{ selectedImages.length }} 张图片
        </span>
        
        <div class="flex items-center space-x-2">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            @click="downloadSelected"
            :disabled="isDownloading"
          >
            <Download class="w-4 h-4 mr-1" />
            下载
          </button>
          
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            @click="shareSelected"
          >
            <Share2 class="w-4 h-4 mr-1" />
            分享
          </button>
          
          <button
            type="button"
            class="btn btn-danger btn-sm"
            @click="deleteSelected"
          >
            <Trash2 class="w-4 h-4 mr-1" />
            删除
          </button>
          
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            @click="clearSelection"
          >
            取消选择
          </button>
        </div>
      </div>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="loading-spinner w-8 h-8"></div>
    </div>
    
    <!-- 空状态 -->
    <div v-else-if="images.length === 0" class="text-center py-12">
      <ImageIcon class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {{ searchQuery ? '没有找到匹配的图片' : '还没有上传任何图片' }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400">
        {{ searchQuery ? '尝试使用不同的搜索词' : '开始上传您的第一张图片吧' }}
      </p>
    </div>
    
    <!-- 图片网格 -->
    <div
      v-else
      class="image-grid"
      :class="{
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6': viewMode === 'grid',
        'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4': viewMode === 'large',
        'columns-2 sm:columns-3 md:columns-4 lg:columns-5': viewMode === 'masonry'
      }"
    >
      <div
        v-for="(image, index) in images"
        :key="image.id"
        class="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
        :class="{
          'ring-2 ring-primary-500': selectedImages.includes(image.id),
          'break-inside-avoid mb-4': viewMode === 'masonry'
        }"
        @click="handleImageClick(image, index)"
      >
        <!-- 选择框 -->
        <div class="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            :checked="selectedImages.includes(image.id)"
            class="w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500"
            @click.stop
            @change="toggleSelection(image.id)"
          />
        </div>
        
        <!-- 图片 -->
        <div class="relative aspect-square overflow-hidden">
          <img
            :src="getThumbnailUrl(image)"
            :alt="image.filename"
            class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            @error="(event) => handleImageError(event, image)"
          />
          
          <!-- 悬停遮罩 -->
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
              <button
                type="button"
                class="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                @click.stop="previewImage(image, index)"
              >
                <Eye class="w-4 h-4 text-gray-700" />
              </button>
              
              <button
                type="button"
                class="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                @click.stop="downloadImage(image)"
              >
                <Download class="w-4 h-4 text-gray-700" />
              </button>
              
              <button
                type="button"
                class="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                @click.stop="shareImage(image)"
              >
                <Share2 class="w-4 h-4 text-gray-700" />
              </button>

              <button
                type="button"
                class="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all hover:bg-red-50"
                @click.stop="deleteSingleImage(image)"
              >
                <Trash2 class="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        </div>
        
        <!-- 图片信息 -->
        <div class="p-3">
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
            {{ image.filename }}
          </h3>

          <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <span>{{ formatFileSize(image.size) }}</span>
            <span>{{ image.width }}×{{ image.height }}</span>
          </div>
          
          <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mt-1">
            <span class="flex items-center">
              <Eye class="w-3 h-3 mr-1" />
              {{ image.view_count }}
            </span>
            <span class="flex items-center">
              <Download class="w-3 h-3 mr-1" />
              {{ image.download_count }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 分页 -->
    <div v-if="pagination && pagination.pages > 1" class="flex justify-center mt-8">
      <nav class="flex items-center space-x-2">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="pagination.page <= 1"
          @click="changePage(pagination.page - 1)"
        >
          <ChevronLeft class="w-4 h-4" />
          上一页
        </button>
        
        <div class="flex items-center space-x-1">
          <button
            v-for="page in visiblePages"
            :key="page"
            type="button"
            class="btn btn-sm"
            :class="page === pagination.page ? 'btn-primary' : 'btn-ghost'"
            @click="changePage(page)"
          >
            {{ page }}
          </button>
        </div>
        
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="pagination.page >= pagination.pages"
          @click="changePage(pagination.page + 1)"
        >
          下一页
          <ChevronRight class="w-4 h-4" />
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Search, ArrowUpDown, Download, Share2, Trash2, Eye,
  Grid3X3, List, Columns, ImageIcon, ChevronLeft, ChevronRight
} from 'lucide-vue-next'
import { imageAPI, downloadFile } from '@/services/api'
import type { Image, Pagination, ViewMode } from '@/types'

// Props
interface Props {
  images: Image[]
  loading?: boolean
  pagination?: Pagination
  viewMode?: ViewMode
  selectedImages?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  viewMode: 'grid',
  selectedImages: () => []
})

// Emits
const emit = defineEmits<{
  imageClick: [image: Image, index: number]
  imagePreview: [image: Image, index: number]
  imageDownload: [image: Image]
  imageShare: [image: Image]
  imagesDownload: [imageIds: string[]]
  imagesShare: [imageIds: string[]]
  imagesDelete: [imageIds: string[]]
  selectionChange: [imageIds: string[]]
  search: [query: string]
  sort: [sortBy: string, sortOrder: 'ASC' | 'DESC']
  pageChange: [page: number]
  viewModeChange: [mode: ViewMode]
}>()

// Reactive data
const searchQuery = ref('')
const sortBy = ref('created_at')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')
const selectedImages = ref<string[]>([...props.selectedImages])
const isDownloading = ref(false)

// View modes
const viewModes = [
  { value: 'grid' as ViewMode, icon: Grid3X3 },
  { value: 'large' as ViewMode, icon: List },
  { value: 'masonry' as ViewMode, icon: Columns }
]

// Computed
const totalImages = computed(() => props.pagination?.total || props.images.length)

const visiblePages = computed(() => {
  if (!props.pagination) return []
  
  const { page, pages } = props.pagination
  const delta = 2
  const range = []
  const rangeWithDots = []
  
  for (let i = Math.max(2, page - delta); i <= Math.min(pages - 1, page + delta); i++) {
    range.push(i)
  }
  
  if (page - delta > 2) {
    rangeWithDots.push(1, '...')
  } else {
    rangeWithDots.push(1)
  }
  
  rangeWithDots.push(...range)
  
  if (page + delta < pages - 1) {
    rangeWithDots.push('...', pages)
  } else if (pages > 1) {
    rangeWithDots.push(pages)
  }
  
  return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index)
})

// Watch
watch(() => props.selectedImages, (newVal) => {
  selectedImages.value = [...newVal]
})

// Methods
const handleImageClick = (image: Image, index: number) => {
  emit('imageClick', image, index)
}

const previewImage = (image: Image, index: number) => {
  emit('imagePreview', image, index)
}

const downloadImage = async (image: Image) => {
  emit('imageDownload', image)
}

const shareImage = (image: Image) => {
  emit('imageShare', image)
}

const toggleSelection = (imageId: string) => {
  const index = selectedImages.value.indexOf(imageId)
  if (index > -1) {
    selectedImages.value.splice(index, 1)
  } else {
    selectedImages.value.push(imageId)
  }
  emit('selectionChange', selectedImages.value)
}

const clearSelection = () => {
  selectedImages.value = []
  emit('selectionChange', selectedImages.value)
}

const downloadSelected = () => {
  if (selectedImages.value.length > 0) {
    emit('imagesDownload', selectedImages.value)
  }
}

const shareSelected = () => {
  if (selectedImages.value.length > 0) {
    emit('imagesShare', selectedImages.value)
  }
}

const deleteSelected = () => {
  if (selectedImages.value.length > 0) {
    emit('imagesDelete', selectedImages.value)
  }
}

const deleteSingleImage = (image: Image) => {
  emit('imagesDelete', [image])
}

const handleSearch = () => {
  emit('search', searchQuery.value)
}

const handleSort = () => {
  emit('sort', sortBy.value, sortOrder.value)
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
  handleSort()
}

const changePage = (page: number) => {
  emit('pageChange', page)
}

const getImageUrl = (image: Image): string => {
  // 返回原图URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  return `${baseUrl}/uploads/${image.stored_filename}`
}

const getThumbnailUrl = (image: Image): string => {
  // 返回缩略图URL，如果没有缩略图则返回原图URL
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
