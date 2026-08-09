<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';

const balance = ref(0);
const logs = ref<any[]>([]);

async function load() {
  try {
    const res: any = await api.memberWallet();
    balance.value = res.account?.balance ?? 0;
    logs.value = res.logs || [];
  } catch {}
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <h2 style="margin: 0">储值明细</h2>
    <div style="font-size: 20px; color: #e6a23c; margin: 12px 0">余额：¥{{ balance }}</div>

    <h3>储值流水</h3>
    <div v-for="l in logs" :key="l.id" class="card">
      {{ l.type === 'recharge' ? '充值' : l.type === 'deduct' ? '扣费' : '退款' }} · ¥{{ l.amount }} · 余额 ¥{{ l.balanceAfter }}
      <div v-if="l.remark" style="color: #999; font-size: 12px">{{ l.remark }}</div>
    </div>
    <el-empty v-if="!logs.length" description="暂无流水" />
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