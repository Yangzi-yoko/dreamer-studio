<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';
import AppImage from '../../components/AppImage.vue';

const route = useRoute();
const id = Number(route.params.id);
const activity = ref<any>(null);

onMounted(async () => {
  try {
    const res: any = await api.activities(1, 100);
    activity.value = (res.list || []).find((a: any) => a.id === id);
  } catch {}
});

async function register() {
  if (!sessionStorage.getItem('member_token')) {
    ElMessage.warning('请先登录');
    return;
  }
  try {
    await api.registerActivity(id);
    ElMessage.success('报名成功');
  } catch (e: any) {
    ElMessage.error(e.message || '报名失败');
  }
}
</script>

<template>
  <div v-if="activity" style="padding: 16px">
    <AppImage :src="activity.image" :ratio="'16 / 9'" radius="10px" preview alt="活动图片" />
    <h2>{{ activity.title }}</h2>
    <p>{{ activity.description }}</p>
    <div style="color: #909399">{{ (activity.startAt || '').slice(0, 10) }} ~ {{ (activity.endAt || '').slice(0, 10) }}</div>
    <el-button type="primary" style="width: 100%; margin-top: 16px" @click="register">报名参加</el-button>
  </div>
  <el-empty v-else description="活动不存在" />
</template>
