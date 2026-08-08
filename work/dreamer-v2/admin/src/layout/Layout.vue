<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const store = useAuthStore();
const router = useRouter();

const topMenus = computed(() => store.menus.filter((m) => m.type === 'menu' && !m.parentId));
const dirs = computed(() => store.menus.filter((m) => m.type === 'dir'));
const childrenOf = (dirId: number) => store.menus.filter((m) => m.type === 'menu' && m.parentId === dirId);

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
        <el-menu-item v-for="m in topMenus" :key="m.id" :index="m.path || ''">
          {{ m.title }}
        </el-menu-item>
        <el-sub-menu v-for="d in dirs" :key="d.id" :index="d.path || String(d.id)">
          <template #title>{{ d.title }}</template>
          <el-menu-item v-for="c in childrenOf(d.id)" :key="c.id" :index="c.path || ''">
            {{ c.title }}
          </el-menu-item>
        </el-sub-menu>
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
