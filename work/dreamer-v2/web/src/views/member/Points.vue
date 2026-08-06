<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';

const memberId = Number(localStorage.getItem('member_id')) || 0;
const balance = ref(0);
const logs = ref<any[]>([]);

onMounted(async () => {
  try {
    const res: any = await api.memberPoints(memberId);
    balance.value = res.account?.balance ?? 0;
    logs.value = res.logs?.list || [];
  } catch {}
});
</script>

<template>
  <div style="padding: 16px">
    <h2>积分明细</h2>
    <div style="font-size: 20px; color: #e6a23c; margin: 8px 0">余额：{{ balance }}</div>
    <div v-for="l in logs" :key="l.id" class="card">
      {{ l.type === 'earn' ? '+' : '-' }}{{ l.points }} · {{ l.remark }} · 余额 {{ l.balanceAfter }}
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 6px;
}
</style>
