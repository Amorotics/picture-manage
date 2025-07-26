<template>
  <div class="modal-overlay">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">
          {{ category ? '编辑分类' : '新建分类' }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <!-- 分类名称 -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            分类名称 *
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            class="input"
            placeholder="请输入分类名称"
          />
        </div>

        <!-- 分类描述 -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            分类描述
          </label>
          <textarea
            v-model="form.description"
            rows="3"
            class="input resize-none"
            placeholder="请输入分类描述"
          />
        </div>

        <!-- 父分类 -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            父分类
          </label>
          <select
            v-model="form.parent_id"
            class="input"
          >
            <option value="">无（顶级分类）</option>
            <option
              v-for="cat in availableParents"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- 分类颜色 -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            分类颜色
          </label>
          <div class="flex items-center gap-3">
            <input
              v-model="form.color"
              type="color"
              class="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer bg-white dark:bg-gray-700"
            />
            <input
              v-model="form.color"
              type="text"
              class="input flex-1"
              placeholder="#3B82F6"
            />
          </div>
        </div>

        <!-- 分类图标 -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            分类图标
          </label>
          <div class="grid grid-cols-6 gap-2">
            <button
              v-for="(icon, key) in iconOptions"
              :key="key"
              type="button"
              @click="form.icon = key"
              class="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              :class="{
                'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400': form.icon === key,
                'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300': form.icon !== key
              }"
            >
              <component :is="icon" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- 排序顺序 -->
        <div>
          <label class="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
            排序顺序
          </label>
          <input
            v-model.number="form.sort_order"
            type="number"
            min="0"
            class="input"
            placeholder="0"
          />
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">数字越小排序越靠前</p>
        </div>

        <!-- 是否启用 -->
        <div v-if="category" class="flex items-center">
          <input
            v-model="form.is_active"
            type="checkbox"
            id="is_active"
            class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
          <label for="is_active" class="ml-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            启用此分类
          </label>
        </div>

        <!-- 按钮 -->
        <div class="flex justify-end gap-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            class="btn btn-secondary"
          >
            取消
          </button>
          <button
            type="submit"
            class="btn btn-primary"
          >
            {{ category ? '更新' : '创建' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  X,
  Image,
  Camera,
  Video,
  FileText,
  Music,
  Archive,
  Star,
  Heart,
  Tag,
  Folder
} from 'lucide-vue-next'
import type { Category } from '@/services/categoryService'

interface Props {
  category?: Category | null
  categories: Category[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: [data: any]
}>()

// 表单数据
const form = ref({
  name: '',
  description: '',
  parent_id: '',
  color: '#3B82F6',
  icon: 'folder',
  sort_order: 0,
  is_active: true
})

// 图标选项
const iconOptions = {
  folder: Folder,
  image: Image,
  camera: Camera,
  video: Video,
  file: FileText,
  music: Music,
  archive: Archive,
  star: Star,
  heart: Heart,
  tag: Tag
}

// 可选的父分类（排除自己和自己的子分类）
const availableParents = computed(() => {
  if (!props.category) return props.categories
  
  const excludeIds = new Set([props.category.id])
  
  // 递归收集所有子分类ID
  const collectChildIds = (cat: Category) => {
    if (cat.children) {
      cat.children.forEach(child => {
        excludeIds.add(child.id)
        collectChildIds(child)
      })
    }
  }
  collectChildIds(props.category)
  
  return props.categories.filter(cat => !excludeIds.has(cat.id))
})

// 监听 category 变化，初始化表单
watch(() => props.category, (newCategory) => {
  if (newCategory) {
    form.value = {
      name: newCategory.name,
      description: newCategory.description || '',
      parent_id: newCategory.parent_id || '',
      color: newCategory.color,
      icon: newCategory.icon || 'folder',
      sort_order: newCategory.sort_order,
      is_active: newCategory.is_active
    }
  } else {
    form.value = {
      name: '',
      description: '',
      parent_id: '',
      color: '#3B82F6',
      icon: 'folder',
      sort_order: 0,
      is_active: true
    }
  }
}, { immediate: true })

// 提交表单
const handleSubmit = () => {
  const data = { ...form.value }
  if (!data.parent_id) {
    delete data.parent_id
  }
  if (!data.description) {
    delete data.description
  }
  if (!data.icon) {
    data.icon = 'folder'
  }
  
  emit('save', data)
}
</script>
