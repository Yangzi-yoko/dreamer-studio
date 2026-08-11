<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';

const router = useRouter();
const list = ref<any[]>([]);

onMounted(async () => {
  try {
    const memberId = Number(sessionStorage.getItem('member_id')) || undefined;
    const res: any = await api.activities(1, 50, memberId);
    list.value = res.list || [];
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>活动</h2>
    <div v-for="a in list" :key="a.id" class="card" @click="router.push(`/activity/${a.id}`)">
      <div style="font-weight: 600">{{ a.title }}</div>
      <div style="color: #909399">{{ a.startAt }} ~ {{ a.endAt }}</div>
    </div>
    <el-empty v-if="!list.length" description="暂无活动" />
  </div>
</template>

<style scoped>
.card {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 8px;
}
</style>
