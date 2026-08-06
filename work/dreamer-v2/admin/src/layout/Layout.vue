<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const store = useAuthStore();
const router = useRouter();

const menus = computed(() => store.menus.filter((m) => m.type !== 'button'));

function logout() {
  store.logout();
  router.push('/login');
}
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside width="220px">
      <div style="padding: 16px; font-weight: 600">造梦者管理后台</div>
      <el-menu router :default-active="$route.path">
        <el-menu-item v-for="m in menus" :key="m.id" :index="m.path || ''">
          {{ m.title }}
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="display: flex; justify-content: flex-end; align-items: center">
        <el-button text @click="logout">退出登录</el-button>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
