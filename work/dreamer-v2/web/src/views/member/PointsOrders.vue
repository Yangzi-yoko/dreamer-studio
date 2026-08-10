<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';

const orders = ref<any[]>([]);
const total = ref(0);
const page = ref(1);

const statusText: Record<string, string> = {
  pending: '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};
const statusType: Record<string, string> = {
  pending: 'warning',
  shipped: 'primary',
  completed: 'success',
  cancelled: 'info',
};

async function load() {
  const res: any = await api.myPointExchanges(page.value, 10);
  orders.value = res.list || [];
  total.value = res.total || 0;
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <h2 style="margin: 0">我的兑换</h2>
      <el-button text @click="page = 1; load()">刷新</el-button>
    </div>

    <div v-for="o in orders" :key="o.id" class="card">
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span style="font-weight: 600">{{ o.productName }}</span>
        <el-tag :type="statusType[o.status] || 'info'">{{ statusText[o.status] || o.status }}</el-tag>
      </div>
      <div style="color: #f56c6c; margin-top: 6px">{{ o.point }} 积分</div>
      <div style="color: #909399; font-size: 12px; margin-top: 4px">
        单号 {{ o.orderNo }} · {{ o.createdAt }}
      </div>
      <div v-if="o.receiverName" style="color: #606266; font-size: 13px; margin-top: 6px">
        收货：{{ o.receiverName }} {{ o.receiverPhone }} · {{ o.receiverAddress }}
      </div>
      <div v-if="o.status === 'cancelled' && o.adminNote" style="color: #f56c6c; font-size: 12px; margin-top: 4px">
        取消原因：{{ o.adminNote }}（积分已退还）
      </div>
    </div>
    <el-empty v-if="!orders.length" description="暂无兑换记录" />
    <el-pagination
      v-if="total > 10"
      v-model:current-page="page"
      :page-size="10"
      :total="total"
      layout="prev, pager, next"
      small
      style="margin-top: 12px"
      @current-change="load"
    />
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