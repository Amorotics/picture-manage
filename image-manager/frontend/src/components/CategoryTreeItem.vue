<template>
  <div class="category-tree-item">
    <div
      class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 group transition-colors"
      :class="{ 'bg-gray-50 dark:bg-gray-700': expanded }"
    >
      <div class="flex items-center gap-3 flex-1">
        <!-- 展开/收起按钮 -->
        <button
          v-if="category.children && category.children.length > 0"
          @click="expanded = !expanded"
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <ChevronRight
            class="w-4 h-4 transition-transform text-gray-600 dark:text-gray-300"
            :class="{ 'rotate-90': expanded }"
          />
        </button>
        <div v-else class="w-6"></div>

        <!-- 分类图标 -->
        <div 
          class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
          :style="{ backgroundColor: category.color }"
        >
          <component 
            v-if="category.icon && iconComponents[category.icon]" 
            :is="iconComponents[category.icon]" 
            class="w-4 h-4" 
          />
          <Folder v-else class="w-4 h-4" />
        </div>

        <!-- 分类信息 -->
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-gray-900 dark:text-white">{{ category.name }}</h3>
            <span
              v-if="category.imageCount !== undefined"
              class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium"
            >
              {{ category.imageCount }} 张图片
            </span>
            <span
              v-if="!category.is_active"
              class="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium"
            >
              已禁用
            </span>
          </div>
          <p v-if="category.description" class="text-sm text-gray-700 dark:text-gray-200 mt-1">
            {{ category.description }}
          </p>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          @click="$emit('edit', category)"
          class="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
          title="编辑"
        >
          <Edit class="w-4 h-4" />
        </button>
        <button
          @click="$emit('delete', category)"
          class="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          title="删除"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 子分类 -->
    <div
      v-if="category.children && category.children.length > 0 && expanded"
      class="ml-6 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-600 pl-4"
    >
      <CategoryTreeItem
        v-for="child in category.children"
        :key="child.id"
        :category="child"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  ChevronRight, 
  Edit, 
  Trash2, 
  Folder,
  Image,
  Camera,
  Video,
  FileText,
  Music,
  Archive,
  Star,
  Heart,
  Tag
} from 'lucide-vue-next'
import type { Category } from '@/services/categoryService'

interface Props {
  category: Category
}

defineProps<Props>()
defineEmits<{
  edit: [category: Category]
  delete: [category: Category]
}>()

const expanded = ref(false)

// 图标组件映射
const iconComponents: Record<string, any> = {
  image: Image,
  camera: Camera,
  video: Video,
  file: FileText,
  music: Music,
  archive: Archive,
  star: Star,
  heart: Heart,
  tag: Tag,
  folder: Folder
}
</script>

<style scoped>
.category-tree-item {
  /* 样式已在模板中使用 Tailwind CSS 类 */
}
</style>
