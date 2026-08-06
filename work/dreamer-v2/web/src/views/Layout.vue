<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const store = useAuthStore();

function logout() {
  store.logout();
  router.push('/login');
}
</script>

<template>
  <div style="display: flex; flex-direction: column; min-height: 100vh">
    <header style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #eee">
      <span style="font-weight: 600">造梦者摄影棚</span>
      <el-button text @click="router.push('/member')">会员中心</el-button>
      <el-button text @click="logout">退出</el-button>
    </header>
    <main style="flex: 1">
      <router-view />
    </main>
    <nav style="display: flex; border-top: 1px solid #eee; padding: 8px 0">
      <el-button text style="flex: 1" @click="router.push('/home')">首页</el-button>
      <el-button text style="flex: 1" @click="router.push('/studios')">场地</el-button>
      <el-button text style="flex: 1" @click="router.push('/items')">器材</el-button>
      <el-button text style="flex: 1" @click="router.push('/activities')">活动</el-button>
      <el-button text style="flex: 1" @click="router.push('/orders')">订单</el-button>
    </nav>
  </div>
</template>
