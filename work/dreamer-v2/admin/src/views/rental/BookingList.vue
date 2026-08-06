<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const status = ref('');
const statusMap: Record<string, string> = {
  pending: '待支付', paid: '已支付', checked: '已核销', completed: '已完成', cancelled: '已取消', refunded: '已退款',
};

async function load() {
  const res: any = await rentalApi.bookingPage({ page: page.value, pageSize: pageSize.value, status: status.value || undefined });
  list.value = res.list;
  total.value = res.total;
}

async function act(row: any, action: string, label: string) {
  await rentalApi.bookingAction(row.id, action);
  ElMessage.success(`${label}成功`);
  load();
}
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>订单管理</h3>
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="load">
        <el-option v-for="(label, key) in statusMap" :key="key" :label="label" :value="key" />
      </el-select>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="bookingNo" label="订单号" width="200" />
      <el-table-column prop="customerName" label="客户" width="100" />
      <el-table-column prop="customerPhone" label="手机号" width="130" />
      <el-table-column prop="bookingDate" label="日期" width="110" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ (row.totalAmountCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ (row.depositCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ statusMap[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="primary" @click="act(row, 'pay', '支付')">支付</el-button>
          <el-button v-if="row.status === 'paid'" link type="primary" @click="act(row, 'check-in', '核销')">核销</el-button>
          <el-button v-if="row.status === 'checked'" link type="success" @click="act(row, 'complete', '完成')">完成</el-button>
          <el-button v-if="row.status === 'pending'" link type="warning" @click="act(row, 'cancel', '取消')">取消</el-button>
          <el-button v-if="row.status === 'paid'" link type="danger" @click="act(row, 'refund', '退款')">退款</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
