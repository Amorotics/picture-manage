<template>
  <div class="category-manager">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">分类管理</h2>
      <button
        @click="showCreateModal = true"
        class="btn btn-primary"
      >
        <Plus class="w-4 h-4" />
        新建分类
      </button>
    </div>

    <!-- 分类树 -->
    <div class="card card-enhanced">
      <div class="p-6">
        <div v-if="loading" class="text-center py-12">
          <div class="loading-spinner h-8 w-8 mx-auto"></div>
          <p class="mt-3 text-gray-700 dark:text-gray-200 font-medium">加载中...</p>
        </div>

        <div v-else-if="categories.length === 0" class="text-center py-12">
          <Folder class="w-16 h-16 text-gray-400 dark:text-gray-400 mx-auto mb-4" />
          <p class="text-gray-700 dark:text-gray-200 font-medium text-lg">暂无分类</p>
          <p class="text-gray-500 dark:text-gray-400 mt-2">点击右上角"新建分类"按钮开始创建</p>
        </div>

        <div v-else class="space-y-2">
          <CategoryTreeItem
            v-for="category in categories"
            :key="category.id"
            :category="category"
            @edit="editCategory"
            @delete="deleteCategory"
          />
        </div>
      </div>
    </div>

    <!-- 创建/编辑分类模态框 -->
    <CategoryModal
      v-if="showCreateModal || showEditModal"
      :category="editingCategory"
      :categories="flatCategories"
      @close="closeModal"
      @save="saveCategory"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Folder } from 'lucide-vue-next'
import CategoryTreeItem from './CategoryTreeItem.vue'
import CategoryModal from './CategoryModal.vue'
import { categoryService, type Category } from '@/services/categoryService'

const categories = ref<Category[]>([])
const loading = ref(false)
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingCategory = ref<Category | null>(null)

// 扁平化的分类列表，用于父分类选择
const flatCategories = computed(() => {
  const flatten = (cats: Category[]): Category[] => {
    const result: Category[] = []
    for (const cat of cats) {
      result.push(cat)
      if (cat.children) {
        result.push(...flatten(cat.children))
      }
    }
    return result
  }
  return flatten(categories.value)
})

// 加载分类
const loadCategories = async () => {
  try {
    loading.value = true
    categories.value = await categoryService.getCategories()
  } catch (error) {
    console.error('加载分类失败:', error)
  } finally {
    loading.value = false
  }
}

// 编辑分类
const editCategory = (category: Category) => {
  editingCategory.value = category
  showEditModal.value = true
}

// 删除分类
const deleteCategory = async (category: Category) => {
  if (!confirm(`确定要删除分类"${category.name}"吗？`)) {
    return
  }

  try {
    await categoryService.deleteCategory(category.id)
    await loadCategories()
  } catch (error) {
    console.error('删除分类失败:', error)
    alert('删除失败，请重试')
  }
}

// 保存分类
const saveCategory = async (categoryData: any) => {
  try {
    if (editingCategory.value) {
      await categoryService.updateCategory(editingCategory.value.id, categoryData)
    } else {
      await categoryService.createCategory(categoryData)
    }
    await loadCategories()
    closeModal()
  } catch (error) {
    console.error('保存分类失败:', error)
    alert('保存失败，请重试')
  }
}

// 关闭模态框
const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  editingCategory.value = null
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.category-manager {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
