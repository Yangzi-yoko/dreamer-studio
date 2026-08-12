<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="not-found">
    <div class="not-found__code">404</div>
    <div class="not-found__text">页面不存在或已被移除</div>
    <el-button type="primary" @click="router.push('/home')">返回首页</el-button>
  </div>
</template>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f5f6f8;
}

.not-found__code {
  font-size: 64px;
  font-weight: 700;
  color: #c0c4cc;
  line-height: 1;
}

.not-found__text {
  color: #909399;
  font-size: 15px;
}
</style>
