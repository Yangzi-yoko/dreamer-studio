<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

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
  const memberId = Number(sessionStorage.getItem('member_id'));
  if (!memberId) {
    ElMessage.warning('请先登录');
    return;
  }
  try {
    await api.registerActivity(id, memberId);
    ElMessage.success('报名成功');
  } catch (e: any) {
    ElMessage.error(e.message || '报名失败');
  }
}
</script>

<template>
  <div v-if="activity" style="padding: 16px">
    <h2>{{ activity.title }}</h2>
    <p>{{ activity.description }}</p>
    <div style="color: #909399">{{ activity.startAt }} ~ {{ activity.endAt }}</div>
    <el-button type="primary" style="width: 100%; margin-top: 16px" @click="register">报名参加</el-button>
  </div>
  <el-empty v-else description="活动不存在" />
</template>
