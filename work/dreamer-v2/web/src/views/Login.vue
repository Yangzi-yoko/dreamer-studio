<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const store = useAuthStore();
const loading = ref(false);
const form = reactive({ phone: '' });

async function submit() {
  if (!/^1\d{10}$/.test(form.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  loading.value = true;
  try {
    await store.login(form.phone);
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
        <el-input v-model="form.phone" placeholder="手机号" maxlength="11" />
      </el-form-item>
      <el-button type="primary" style="width: 100%" :loading="loading" @click="submit">登录</el-button>
    </el-form>
    <div style="text-align: center; margin-top: 12px">
      <router-link to="/register">没有账号？去注册</router-link>
    </div>
  </div>
</template>
