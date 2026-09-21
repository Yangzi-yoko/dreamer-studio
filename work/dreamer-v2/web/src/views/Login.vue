<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const store = useAuthStore();
const loading = ref(false);
const rememberMe = ref(false);

const STORAGE_KEY = 'dreamer_h5_remember';

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
  if (!form.username.trim()) {
    ElMessage.warning('请输入账号');
    return;
  }
  if (!form.password) {
    ElMessage.warning('请输入密码');
    return;
  }
  loading.value = true;
  try {
    saveRemember();
    await store.login(form.username.trim(), form.password);
    ElMessage.success('登录成功');
    router.push('/home');
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="padding: 24px">
    <h2 style="text-align: center">造梦者摄影棚</h2>
    <el-form @submit.prevent="submit">
      <el-form-item>
        <el-input v-model="form.username" placeholder="账号" maxlength="64" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.password" type="password" placeholder="密码" maxlength="64" show-password />
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="rememberMe" style="margin: 0">记住账号密码</el-checkbox>
      </el-form-item>
      <el-button type="primary" style="width: 100%" :loading="loading" @click="submit">登录</el-button>
    </el-form>
    <div style="text-align: center; margin-top: 12px">
      <router-link to="/register">没有账号？去注册</router-link>
    </div>
  </div>
</template>
