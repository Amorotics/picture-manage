<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { Image, FolderOpen } from 'lucide-vue-next'


</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- 头部导航 -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center space-x-8">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Amorotics的图库
            </h1>

            <!-- 导航菜单 -->
            <nav class="flex space-x-6">
              <RouterLink
                to="/"
                class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                :class="$route.path === '/'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'"
              >
                <Image class="w-4 h-4" />
                图片库
              </RouterLink>

              <RouterLink
                to="/categories"
                class="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                :class="$route.path === '/categories'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'"
              >
                <FolderOpen class="w-4 h-4" />
                分类管理
              </RouterLink>
            </nav>
          </div>

          <div class="flex items-center space-x-4">
            <!-- 其他控件可以在这里添加 -->
          </div>
        </div>
      </div>
    </header>

    <!-- 主要内容 -->
    <main>
      <RouterView />
    </main>
  </div>
</template>
