<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { shareAPI, downloadFile } from '@/services/api'
import type { Image } from '@/types'

const route = useRoute()
const token = route.params.token as string

// Reactive data
const loading = ref(true)
const error = ref('')
const passwordRequired = ref(false)
const password = ref('')
const shareInfo = ref<any>(null)
const images = ref<Image[]>([])
const currentImageIndex = ref(0)

// Computed
const currentImage = computed(() => {
  return images.value[currentImageIndex.value]
})

const isGallery = computed(() => {
  return shareInfo.value?.shareType !== 'single' && images.value.length > 1
})

// Methods
const loadShare = async (pwd?: string) => {
  try {
    loading.value = true
    error.value = ''
    
    const response = await shareAPI.getShare(token, pwd)
    
    if (response.success) {
      shareInfo.value = response.data.shareInfo
      images.value = response.data.images
      passwordRequired.value = false
    }
  } catch (err: any) {
    if (err.message.includes('需要密码')) {
      passwordRequired.value = true
      error.value = ''
    } else {
      error.value = err.message || '加载分享内容失败'
    }
  } finally {
    loading.value = false
  }
}

const handlePasswordSubmit = () => {
  if (password.value.trim()) {
    loadShare(password.value)
  }
}

const handleDownload = async (image?: Image) => {
  try {
    const targetImage = image || currentImage.value
    if (!targetImage) return
    
    const response = await shareAPI.downloadShare(
      token, 
      password.value || undefined, 
      targetImage.id
    )
    downloadFile(response, targetImage.filename)
  } catch (err: any) {
    alert('下载失败: ' + (err.message || '未知错误'))
  }
}

const handleDownloadAll = async () => {
  try {
    const response = await shareAPI.downloadShare(token, password.value || undefined)
    const filename = shareInfo.value?.title ? 
      `${shareInfo.value.title}.zip` : 
      `images-${Date.now()}.zip`
    downloadFile(response, filename)
  } catch (err: any) {
    alert('下载失败: ' + (err.message || '未知错误'))
  }
}

const getImageUrl = (image: Image): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  return `${baseUrl}/uploads/${image.stored_filename}`
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
  return getImageUrl(image)
}

const handleImageError = (event: Event, image: Image) => {
  const img = event.target as HTMLImageElement
  // 如果缩略图加载失败，尝试加载原图
  if (img.src.includes('_thumb')) {
    img.src = getImageUrl(image)
  }
}

const nextImage = () => {
  if (currentImageIndex.value < images.value.length - 1) {
    currentImageIndex.value++
  }
}

const prevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

const goToImage = (index: number) => {
  currentImageIndex.value = index
}

// Lifecycle
onMounted(() => {
  loadShare()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-600">加载中...</p>
      </div>
    </div>

    <!-- 密码输入 -->
    <div v-else-if="passwordRequired" class="flex items-center justify-center min-h-screen">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 class="text-2xl font-bold text-center mb-6">输入访问密码</h2>
        <form @submit.prevent="handlePasswordSubmit" class="space-y-4">
          <div>
            <input
              v-model="password"
              type="password"
              placeholder="请输入密码"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            class="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
          >
            访问
          </button>
        </form>
        <p v-if="error" class="text-red-500 text-sm mt-4 text-center">{{ error }}</p>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 class="text-2xl font-bold text-gray-800 mb-2">访问失败</h2>
        <p class="text-gray-600">{{ error }}</p>
      </div>
    </div>

    <!-- 分享内容 -->
    <div v-else class="container mx-auto px-4 py-8">
      <!-- 头部信息 -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">{{ shareInfo?.title }}</h1>
        <p v-if="shareInfo?.description" class="text-gray-600 mb-4">{{ shareInfo.description }}</p>
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>{{ images.length }} 张图片</span>
          <span>查看次数: {{ shareInfo?.viewCount || 0 }}</span>
        </div>
      </div>

      <!-- 单张图片显示 -->
      <div v-if="!isGallery && currentImage" class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="relative">
          <img
            :src="getImageUrl(currentImage)"
            :alt="currentImage.filename"
            class="w-full h-auto max-h-screen object-contain"
          />
        </div>
        <div class="p-6">
          <h3 class="text-xl font-semibold mb-2">{{ currentImage.filename }}</h3>
          <p v-if="currentImage.description" class="text-gray-600 mb-4">{{ currentImage.description }}</p>
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">
              <span>{{ currentImage.size_text }}</span>
              <span class="mx-2">•</span>
              <span>{{ currentImage.mime_type }}</span>
            </div>
            <button
              v-if="shareInfo?.allowDownload"
              @click="handleDownload()"
              class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              下载
            </button>
          </div>
        </div>
      </div>

      <!-- 图片画廊 -->
      <div v-else-if="isGallery">
        <!-- 主图显示 -->
        <div class="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div class="relative">
            <img
              :src="getImageUrl(currentImage)"
              :alt="currentImage.filename"
              class="w-full h-auto max-h-96 object-contain"
            />
            <!-- 导航按钮 -->
            <button
              v-if="currentImageIndex > 0"
              @click="prevImage"
              class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
            >
              ←
            </button>
            <button
              v-if="currentImageIndex < images.length - 1"
              @click="nextImage"
              class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
            >
              →
            </button>
          </div>
          <div class="p-6">
            <h3 class="text-xl font-semibold mb-2">{{ currentImage.filename }}</h3>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">{{ currentImageIndex + 1 }} / {{ images.length }}</span>
              <div class="space-x-2">
                <button
                  v-if="shareInfo?.allowDownload"
                  @click="handleDownload()"
                  class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  下载当前
                </button>
                <button
                  v-if="shareInfo?.allowDownload && images.length > 1"
                  @click="handleDownloadAll"
                  class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  下载全部
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 缩略图网格 -->
        <div class="bg-white rounded-lg shadow-md p-6">
          <h4 class="text-lg font-semibold mb-4">所有图片</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div
              v-for="(image, index) in images"
              :key="image.id"
              @click="goToImage(index)"
              class="relative cursor-pointer group"
              :class="{ 'ring-2 ring-blue-500': index === currentImageIndex }"
            >
              <img
                :src="getThumbnailUrl(image)"
                :alt="image.filename"
                class="w-full h-24 object-cover rounded-lg group-hover:opacity-75 transition-opacity"
                @error="(event) => handleImageError(event, image)"
              />
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 rounded-lg transition-all"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
