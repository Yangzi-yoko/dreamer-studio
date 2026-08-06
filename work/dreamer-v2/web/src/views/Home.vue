<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';

const router = useRouter();
const studios = ref<any[]>([]);
const items = ref<any[]>([]);
const activities = ref<any[]>([]);

onMounted(async () => {
  try {
    const s: any = await api.studios(1, 6);
    studios.value = s.list || [];
  } catch {}
  try {
    const i: any = await api.items(1, 6);
    items.value = i.list || [];
  } catch {}
  try {
    const a: any = await api.activities(1, 3);
    activities.value = a.list || [];
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>热门场地</h2>
    <div v-for="s in studios" :key="s.id" class="card" @click="router.push(`/studio/${s.id}`)">
      <div style="font-weight: 600">{{ s.name }}</div>
      <div style="color: #e6a23c">¥{{ s.weekdayPrice }}/时段起</div>
    </div>

    <h2>器材/服装</h2>
    <div v-for="i in items" :key="i.id" class="card" @click="router.push(`/item/${i.id}`)">
      <div style="font-weight: 600">{{ i.name }}</div>
      <div style="color: #e6a23c">¥{{ i.unitPrice }}{{ i.billingType === 'day' ? '/天' : '/时段' }}</div>
    </div>

    <h2>热门活动</h2>
    <div v-for="a in activities" :key="a.id" class="card" @click="router.push(`/activity/${a.id}`)">
      <div style="font-weight: 600">{{ a.title }}</div>
    </div>
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
