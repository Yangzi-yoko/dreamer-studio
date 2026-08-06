<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../api';

const route = useRoute();
const router = useRouter();
const id = Number(route.params.id);
const studio = ref<any>(null);

onMounted(async () => {
  try {
    const res: any = await api.studios(1, 100);
    studio.value = (res.list || []).find((s: any) => s.id === id);
  } catch {}
});
</script>

<template>
  <div v-if="studio" style="padding: 16px">
    <h2>{{ studio.name }}</h2>
    <div>{{ studio.address }}</div>
    <p>{{ studio.description }}</p>
    <div>工作日 ¥{{ studio.weekdayPrice }} / 时段</div>
    <div>周末 ¥{{ studio.weekendPrice }} / 时段</div>
    <div>节假日 ¥{{ studio.holidayPrice }} / 时段</div>
    <div>押金 ¥{{ studio.deposit }}</div>
    <el-button type="primary" style="width: 100%; margin-top: 16px" @click="router.push(`/booking/${studio.id}`)">立即预订</el-button>
  </div>
  <el-empty v-else description="场地不存在" />
</template>
