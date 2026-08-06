<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api';

const router = useRouter();
const list = ref<any[]>([]);

onMounted(async () => {
  try {
    const res: any = await api.studios(1, 50);
    list.value = res.list || [];
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>场地租赁</h2>
    <div v-for="s in list" :key="s.id" class="card" @click="router.push(`/studio/${s.id}`)">
      <div style="font-weight: 600">{{ s.name }}</div>
      <div>{{ s.address }}</div>
      <div style="color: #e6a23c">工作日 ¥{{ s.weekdayPrice }} / 周末 ¥{{ s.weekendPrice }} / 节假日 ¥{{ s.holidayPrice }}</div>
      <div style="color: #909399">押金 ¥{{ s.deposit }}</div>
    </div>
    <el-empty v-if="!list.length" description="暂无场地" />
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
