<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';

const phone = ref(localStorage.getItem('member_phone') || '');
const list = ref<any[]>([]);
const statusMap: Record<string, string> = {
  pending: '待支付', paid: '已支付', picked: '已领取', returned: '已归还', completed: '已完成', cancelled: '已取消', refunded: '已退款',
};

async function load() {
  if (!phone.value) return;
  try {
    list.value = (await api.myItemRentals(phone.value)) as any[];
  } catch {}
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <h2>我的租单</h2>
    <div style="display: flex; gap: 8px; margin-bottom: 12px">
      <el-input v-model="phone" placeholder="手机号" maxlength="11" />
      <el-button type="primary" @click="load">查询</el-button>
    </div>
    <div v-for="r in list" :key="r.id" class="card">
      <div>{{ r.rentalNo }} · {{ r.startDate }} 至 {{ r.endDate }}</div>
      <div>数量 {{ r.quantity }} · 金额 ¥{{ (r.totalAmountCents / 100).toFixed(2) }} · 押金 ¥{{ (r.depositCents / 100).toFixed(2) }}</div>
      <el-tag>{{ statusMap[r.status] || r.status }}</el-tag>
    </div>
    <el-empty v-if="!list.length" description="暂无租单" />
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
