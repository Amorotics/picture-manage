<template>
  <div class="category-view">
    <CategoryManager />
  </div>
</template>

<script setup lang="ts">
import CategoryManager from '@/components/CategoryManager.vue'
</script>

<style scoped>
.category-view {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 2rem;
}

@media (prefers-color-scheme: dark) {
  .category-view {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
}
</style>
