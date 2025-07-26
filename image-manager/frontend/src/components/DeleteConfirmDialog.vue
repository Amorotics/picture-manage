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
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="close"
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
            class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4"
            @click.stop
          >
            <!-- 头部 -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div class="flex items-center space-x-3">
                <div class="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                  <AlertTriangle class="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  确认删除
                </h3>
              </div>
              <button
                type="button"
                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                @click="close"
              >
                <X class="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <!-- 内容 -->
            <div class="p-6">
              <div class="mb-4">
                <p class="text-gray-700 dark:text-gray-300 mb-3">
                  {{ message }}
                </p>
                
                <!-- 显示要删除的图片预览 -->
                <div v-if="images && images.length > 0" class="space-y-3">
                  <div v-if="images.length === 1" class="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <img
                      :src="getThumbnailUrl(images[0])"
                      :alt="images[0].filename"
                      class="w-12 h-12 object-cover rounded"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {{ images[0].filename }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatFileSize(images[0].size) }}
                      </p>
                    </div>
                  </div>
                  
                  <div v-else class="max-h-32 overflow-y-auto space-y-2">
                    <div
                      v-for="image in images.slice(0, 3)"
                      :key="image.id"
                      class="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <img
                        :src="getThumbnailUrl(image)"
                        :alt="image.filename"
                        class="w-8 h-8 object-cover rounded"
                      />
                      <p class="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">
                        {{ image.filename }}
                      </p>
                    </div>
                    <div v-if="images.length > 3" class="text-xs text-gray-500 dark:text-gray-400 text-center">
                      还有 {{ images.length - 3 }} 张图片...
                    </div>
                  </div>
                </div>
              </div>

              <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <div class="flex items-start space-x-2">
                  <AlertTriangle class="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p class="text-sm text-yellow-800 dark:text-yellow-200">
                    此操作无法撤销。删除后，图片文件和相关数据将永久丢失。
                  </p>
                </div>
              </div>
            </div>

            <!-- 底部按钮 -->
            <div class="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                class="btn btn-secondary"
                @click="close"
                :disabled="isDeleting"
              >
                取消
              </button>
              <button
                type="button"
                class="btn btn-danger"
                @click="confirmDelete"
                :disabled="isDeleting"
              >
                <div v-if="isDeleting" class="loading-spinner w-4 h-4 mr-2"></div>
                <Trash2 v-else class="w-4 h-4 mr-2" />
                {{ isDeleting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, AlertTriangle, Trash2 } from 'lucide-vue-next'
import type { Image } from '@/types'

// Props
interface Props {
  isOpen: boolean
  images?: Image[]
  message?: string
}

const props = withDefaults(defineProps<Props>(), {
  message: '确定要删除选中的图片吗？'
})

// Emits
const emit = defineEmits<{
  close: []
  confirm: [images: Image[]]
}>()

// State
const isDeleting = ref(false)

// Methods
const close = () => {
  if (!isDeleting.value) {
    emit('close')
  }
}

const confirmDelete = async () => {
  if (!props.images || props.images.length === 0) return
  
  isDeleting.value = true
  try {
    emit('confirm', props.images)
  } finally {
    isDeleting.value = false
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>
