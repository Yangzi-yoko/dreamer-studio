<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';
import AppImage from '../../components/AppImage.vue';

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
      <AppImage :src="a.image" :ratio="'16 / 8'" radius="8px" alt="活动图片" />
      <div class="card__body">
        <div class="card__title">{{ a.title }}</div>
        <div class="card__time">{{ (a.startAt || '').slice(0, 10) }} ~ {{ (a.endAt || '').slice(0, 10) }}</div>
      </div>
    </div>
    <el-empty v-if="!list.length" description="暂无活动" />
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
  background: #fff;
  cursor: pointer;
}

.card__body {
  padding: 10px 12px;
}

.card__title {
  font-size: 15px;
  font-weight: 600;
}

.card__time {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
</style>
