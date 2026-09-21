<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const store = useAuthStore();
const router = useRouter();
const loading = ref(false);
const rememberMe = ref(false);

const STORAGE_KEY = 'dreamer_admin_remember';

const form = reactive({ username: '', password: '' });

onMounted(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(atob(saved));
      form.username = data.username || '';
      form.password = data.password || '';
      rememberMe.value = true;
    }
  } catch {
    // ignore
  }
});

function saveRemember() {
  if (rememberMe.value) {
    localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify({
      username: form.username,
      password: form.password,
    })));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

async function submit() {
  loading.value = true;
  try {
    saveRemember();
    await store.login(form.username, form.password);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh">
    <el-card style="width: 360px">
      <h3 style="text-align: center">造梦者管理后台</h3>
      <el-form :model="form" @submit.prevent="submit">
        <el-form-item><el-input v-model="form.username" placeholder="用户名" /></el-form-item>
        <el-form-item><el-input v-model="form.password" type="password" placeholder="密码" show-password /></el-form-item>
        <el-form-item>
          <el-checkbox v-model="rememberMe">记住账号密码</el-checkbox>
        </el-form-item>
        <el-button type="primary" style="width: 100%" :loading="loading" @click="submit">登录</el-button>
      </el-form>
    </el-card>
  </div>
</template>
