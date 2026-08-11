<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const store = useAuthStore();
const loading = ref(false);
const form = reactive({
  phone: '',
  username: '',
  password: '',
  nickname: '',
  inviteCode: (route.query.inviteCode as string) || '',
  agree: false,
});

async function submit() {
  if (!/^1\d{10}$/.test(form.phone)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  if (!form.username.trim() || form.username.trim().length < 2) {
    ElMessage.warning('账号至少 2 个字符');
    return;
  }
  if (!form.password || form.password.length < 8 || !/(?=.*[A-Za-z])(?=.*\d)/.test(form.password)) {
    ElMessage.warning('密码至少 8 位，且需同时包含字母和数字');
    return;
  }
  if (!form.nickname.trim()) {
    ElMessage.warning('请输入昵称');
    return;
  }
  if (!form.agree) {
    ElMessage.warning('请先阅读并同意服务条款');
    return;
  }
  loading.value = true;
  try {
    await store.register(form.phone, form.username.trim(), form.password, form.nickname.trim(), form.inviteCode.trim() || undefined);
    ElMessage.success('注册成功');
    router.push('/home');
  } catch (e: any) {
    ElMessage.error(e.message || '注册失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="padding: 24px">
    <h2 style="text-align: center">注册新账号</h2>
    <el-form @submit.prevent="submit">
      <el-form-item>
        <el-input v-model="form.phone" placeholder="手机号" maxlength="11" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.username" placeholder="账号（至少 2 个字符）" maxlength="64" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.password" type="password" placeholder="密码（至少 8 位，含字母和数字）" maxlength="64" show-password />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.nickname" placeholder="昵称" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="form.inviteCode" placeholder="邀请码（选填）" maxlength="16" />
      </el-form-item>
      <el-form-item style="margin-bottom: 8px">
        <el-checkbox v-model="form.agree">
          我已阅读并同意《服务条款》与《隐私政策》
        </el-checkbox>
      </el-form-item>
      <el-button type="primary" style="width: 100%" :loading="loading" @click="submit">注册</el-button>
    </el-form>
    <div style="text-align: center; margin-top: 12px">
      <router-link to="/login">已有账号？去登录</router-link>
    </div>
  </div>
</template>