<template>
  <div class="image-upload">
    <!-- 拖放区域 -->
    <div
      ref="dropZone"
      class="drop-zone"
      :class="{
        'drop-zone-active': isDragActive,
        'border-red-500': hasError
      }"
      @click="openFileDialog"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="flex flex-col items-center justify-center py-12">
        <Upload class="w-12 h-12 text-gray-500 dark:text-gray-400 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {{ isDragActive ? '释放文件以上传' : '上传图片' }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">
          拖放图片文件到此处，或点击选择文件<br>
          支持 JPEG、PNG、WebP、TIFF、GIF 格式，单个文件最大 50MB
        </p>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="isUploading"
        >
          <FolderOpen class="w-4 h-4 mr-2" />
          选择文件
        </button>
      </div>
    </div>

    <!-- 文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- 上传进度 -->
    <div v-if="uploadProgress.length > 0" class="mt-6">
      <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        上传进度 ({{ completedUploads }}/{{ uploadProgress.length }})
      </h4>
      
      <div class="space-y-3">
        <div
          v-for="(progress, index) in uploadProgress"
          :key="index"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <img
                  v-if="progress.preview"
                  :src="progress.preview"
                  :alt="progress.file.name"
                  class="w-10 h-10 rounded object-cover"
                />
                <div v-else class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <Image class="w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ progress.file.name }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatFileSize(progress.file.size) }}
                </p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2">
              <div v-if="progress.status === 'uploading'" class="flex items-center space-x-2">
                <div class="loading-spinner w-4 h-4"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  {{ progress.progress }}%
                </span>
              </div>
              
              <CheckCircle
                v-else-if="progress.status === 'success'"
                class="w-5 h-5 text-green-500"
              />
              
              <XCircle
                v-else-if="progress.status === 'error'"
                class="w-5 h-5 text-red-500"
              />
              
              <Clock
                v-else
                class="w-5 h-5 text-gray-400"
              />
            </div>
          </div>
          
          <!-- 进度条 -->
          <div v-if="progress.status === 'uploading'" class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${progress.progress}%` }"
            ></div>
          </div>
          
          <!-- 错误信息 -->
          <div v-if="progress.status === 'error' && progress.error" class="mt-2">
            <p class="text-sm text-red-600 dark:text-red-400">
              {{ progress.error }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="flex justify-between items-center mt-4">
        <button
          v-if="hasErrors"
          type="button"
          class="btn btn-secondary"
          @click="retryFailedUploads"
        >
          <RefreshCw class="w-4 h-4 mr-2" />
          重试失败的上传
        </button>
        
        <button
          type="button"
          class="btn btn-ghost"
          @click="clearProgress"
        >
          清除列表
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Upload, FolderOpen, Image, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-vue-next'
import { imageAPI } from '@/services/api'
import type { UploadProgress, FileValidation } from '@/types'

// Props
interface Props {
  maxFiles?: number
  maxFileSize?: number // bytes
  acceptedTypes?: string[]
  autoUpload?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxFiles: 10,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  acceptedTypes: () => ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'image/gif'],
  autoUpload: true
})

// Emits
const emit = defineEmits<{
  uploadComplete: [images: any[]]
  uploadError: [error: string]
  filesSelected: [files: File[]]
}>()

// Refs
const dropZone = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const isDragActive = ref(false)
const isUploading = ref(false)
const uploadProgress = ref<UploadProgress[]>([])
const hasError = ref(false)

// Computed
const completedUploads = computed(() => {
  return uploadProgress.value.filter(p => p.status === 'success' || p.status === 'error').length
})

const hasErrors = computed(() => {
  return uploadProgress.value.some(p => p.status === 'error')
})

// Methods
const openFileDialog = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    handleFiles(Array.from(target.files))
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragActive.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  // 只有当离开整个拖放区域时才设置为 false
  if (!dropZone.value?.contains(event.relatedTarget as Node)) {
    isDragActive.value = false
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragActive.value = false
  
  const files = Array.from(event.dataTransfer?.files || [])
  handleFiles(files)
}

const validateFile = (file: File): FileValidation => {
  // 检查文件类型
  if (!props.acceptedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `不支持的文件类型: ${file.type}`,
      file
    }
  }
  
  // 检查文件大小
  if (file.size > props.maxFileSize) {
    return {
      isValid: false,
      error: `文件大小超出限制: ${formatFileSize(file.size)}`,
      file
    }
  }
  
  return { isValid: true, file }
}

const handleFiles = async (files: File[]) => {
  hasError.value = false
  
  // 验证文件数量
  if (files.length > props.maxFiles) {
    hasError.value = true
    emit('uploadError', `最多只能选择 ${props.maxFiles} 个文件`)
    return
  }
  
  // 验证每个文件
  const validations = files.map(validateFile)
  const invalidFiles = validations.filter(v => !v.isValid)
  
  if (invalidFiles.length > 0) {
    hasError.value = true
    emit('uploadError', invalidFiles[0].error!)
    return
  }
  
  const validFiles = validations.map(v => v.file)
  emit('filesSelected', validFiles)
  
  if (props.autoUpload) {
    await uploadFiles(validFiles)
  }
}

const uploadFiles = async (files: File[]) => {
  isUploading.value = true
  
  // 初始化进度
  uploadProgress.value = files.map(file => ({
    file,
    progress: 0,
    status: 'pending' as const,
    preview: createPreview(file)
  }))
  
  const uploadedImages: any[] = []
  
  // 逐个上传文件
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const progressItem = uploadProgress.value[i]
    
    try {
      progressItem.status = 'uploading'
      
      const formData = new FormData()
      formData.append('images', file)
      
      const response = await imageAPI.uploadImages(formData, (progress) => {
        progressItem.progress = progress
      })
      
      if (response.success && response.data.uploaded.length > 0) {
        progressItem.status = 'success'
        progressItem.progress = 100
        progressItem.result = response.data.uploaded[0]
        uploadedImages.push(response.data.uploaded[0])
      } else {
        throw new Error(response.message || '上传失败')
      }
    } catch (error) {
      progressItem.status = 'error'
      progressItem.error = error instanceof Error ? error.message : '上传失败'
    }
  }
  
  isUploading.value = false
  
  if (uploadedImages.length > 0) {
    emit('uploadComplete', uploadedImages)
  }
  
  if (hasErrors.value) {
    emit('uploadError', '部分文件上传失败')
  }
}

const retryFailedUploads = async () => {
  const failedFiles = uploadProgress.value
    .filter(p => p.status === 'error')
    .map(p => p.file)
  
  if (failedFiles.length > 0) {
    await uploadFiles(failedFiles)
  }
}

const clearProgress = () => {
  uploadProgress.value = []
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const createPreview = (file: File): string | undefined => {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file)
  }
  return undefined
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 清理预览 URL
onUnmounted(() => {
  uploadProgress.value.forEach(progress => {
    if (progress.preview) {
      URL.revokeObjectURL(progress.preview)
    }
  })
})
</script>
