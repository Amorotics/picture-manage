<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { imageAPI, shareAPI, downloadFile } from '@/services/api'
import ImageUpload from '@/components/ImageUpload.vue'
import ImageGrid from '@/components/ImageGrid.vue'
import ImageModal from '@/components/ImageModal.vue'
import ShareDialog from '@/components/ShareDialog.vue'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import type { Image, Pagination, ViewMode, ImageFilters } from '@/types'

// Reactive data
const images = ref<Image[]>([])
const loading = ref(false)
const pagination = ref<Pagination>()
const viewMode = ref<ViewMode>('grid')
const selectedImages = ref<string[]>([])
const filters = ref<ImageFilters>({
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'DESC'
})

// Modal states
const imageModal = ref({
  isOpen: false,
  image: undefined as Image | undefined,
  images: [] as Image[],
  currentIndex: 0
})

const shareDialog = ref({
  isOpen: false,
  image: undefined as Image | undefined,
  images: [] as Image[]
})

const deleteDialog = ref({
  isOpen: false,
  images: [] as Image[]
})

// Methods
const loadImages = async () => {
  try {
    loading.value = true
    const response = await imageAPI.getImages(filters.value)

    if (response.success) {
      images.value = response.data.images
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('加载图片失败:', error)
  } finally {
    loading.value = false
  }
}

const handleUploadComplete = (uploadedImages: Image[]) => {
  // 将新上传的图片添加到列表开头
  images.value.unshift(...uploadedImages)

  // 显示成功消息
  console.log(`成功上传 ${uploadedImages.length} 张图片`)
}

const handleImageClick = (image: Image, index: number) => {
  imageModal.value = {
    isOpen: true,
    image,
    images: images.value,
    currentIndex: index
  }
}

const handleImagePreview = (image: Image, index: number) => {
  handleImageClick(image, index)
}

const handleImageDownload = async (image: Image) => {
  try {
    const response = await imageAPI.downloadImage(image.id)
    downloadFile(response, image.filename)
  } catch (error) {
    console.error('下载图片失败:', error)
  }
}

const handleImageShare = (image: Image) => {
  shareDialog.value = {
    isOpen: true,
    image,
    images: []
  }
}

const handleImageDelete = (image: Image) => {
  // 打开删除确认对话框
  deleteDialog.value = {
    isOpen: true,
    images: [image]
  }
}

const handleImagesDownload = async (imageIds: string[]) => {
  try {
    const response = await imageAPI.downloadBatch(imageIds)
    downloadFile(response, `images-${Date.now()}.zip`)
  } catch (error) {
    console.error('批量下载失败:', error)
  }
}

const handleImagesShare = (imageIds: string[]) => {
  const selectedImageList = images.value.filter(img => imageIds.includes(img.id))
  shareDialog.value = {
    isOpen: true,
    image: undefined,
    images: selectedImageList
  }
}

const handleImagesDelete = async (imagesToDelete: Image[]) => {
  // 打开删除确认对话框
  deleteDialog.value = {
    isOpen: true,
    images: imagesToDelete
  }
}

const confirmDelete = async (imagesToDelete: Image[]) => {
  try {
    for (const image of imagesToDelete) {
      await imageAPI.deleteImage(image.id)
    }

    // 从列表中移除已删除的图片
    const deletedIds = imagesToDelete.map(img => img.id)
    images.value = images.value.filter(img => !deletedIds.includes(img.id))
    selectedImages.value = []

    // 关闭对话框
    deleteDialog.value.isOpen = false

    // 如果当前预览的图片被删除了，关闭预览
    if (imageModal.value.isOpen && imageModal.value.image &&
        imagesToDelete.some(img => img.id === imageModal.value.image?.id)) {
      imageModal.value.isOpen = false
    }

    console.log('图片删除成功')
  } catch (error) {
    console.error('删除图片失败:', error)
    alert('删除失败: ' + (error as Error).message)
  }
}

const handleSelectionChange = (imageIds: string[]) => {
  selectedImages.value = imageIds
}

const handleSearch = (query: string) => {
  filters.value.search = query
  filters.value.page = 1
  loadImages()
}

const handleSort = (sortBy: string, sortOrder: 'ASC' | 'DESC') => {
  filters.value.sortBy = sortBy
  filters.value.sortOrder = sortOrder
  filters.value.page = 1
  loadImages()
}

const handlePageChange = (page: number) => {
  filters.value.page = page
  loadImages()
}

const handleViewModeChange = (mode: ViewMode) => {
  viewMode.value = mode
}

const handleModalNavigate = (index: number) => {
  imageModal.value.currentIndex = index
}

const handleShareSuccess = (shareLink: any) => {
  console.log('分享链接创建成功:', shareLink)

  // 复制链接到剪贴板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareLink.shareUrl)
    alert('分享链接已复制到剪贴板')
  } else {
    alert(`分享链接: ${shareLink.shareUrl}`)
  }
}

// Lifecycle
onMounted(() => {
  loadImages()
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- 上传区域 -->
    <div class="mb-8">
      <ImageUpload
        :max-files="10"
        :max-file-size="50 * 1024 * 1024"
        @upload-complete="handleUploadComplete"
        @upload-error="(error) => console.error('上传错误:', error)"
      />
    </div>

    <!-- 图片网格 -->
    <ImageGrid
      :images="images"
      :loading="loading"
      :pagination="pagination"
      :view-mode="viewMode"
      :selected-images="selectedImages"
      @image-click="handleImageClick"
      @image-preview="handleImagePreview"
      @image-download="handleImageDownload"
      @image-share="handleImageShare"
      @images-download="handleImagesDownload"
      @images-share="handleImagesShare"
      @images-delete="handleImagesDelete"
      @selection-change="handleSelectionChange"
      @search="handleSearch"
      @sort="handleSort"
      @page-change="handlePageChange"
      @view-mode-change="handleViewModeChange"
    />

    <!-- 图片预览模态框 -->
    <ImageModal
      :is-open="imageModal.isOpen"
      :image="imageModal.image"
      :images="imageModal.images"
      :current-index="imageModal.currentIndex"
      @close="imageModal.isOpen = false"
      @download="handleImageDownload"
      @share="handleImageShare"
      @delete="handleImageDelete"
      @navigate="handleModalNavigate"
    />

    <!-- 分享对话框 -->
    <ShareDialog
      :is-open="shareDialog.isOpen"
      :image="shareDialog.image"
      :images="shareDialog.images"
      @close="shareDialog.isOpen = false"
      @success="handleShareSuccess"
      @error="(error) => console.error('分享错误:', error)"
    />

    <!-- 删除确认对话框 -->
    <DeleteConfirmDialog
      :is-open="deleteDialog.isOpen"
      :images="deleteDialog.images"
      :message="deleteDialog.images.length === 1 ?
        '确定要删除这张图片吗？' :
        `确定要删除选中的 ${deleteDialog.images.length} 张图片吗？`"
      @close="deleteDialog.isOpen = false"
      @confirm="confirmDelete"
    />
  </div>
</template>
