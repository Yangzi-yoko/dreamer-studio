<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const status = ref('');
const statusMap: Record<string, string> = { pending: 'Pending', paid: 'Paid', cancelled: 'Cancelled' };

async function load() {
  const res: any = await memberApi.rechargeOrdersPage(page.value, pageSize.value, status.value || undefined);
  list.value = res.list;
  total.value = res.total;
}

async function pay(row: any) {
  const totalAmount = Number(row.amount) + Number(row.bonus || 0);
  const bonusText = row.bonus > 0 ? ` (bonus: ${row.bonus})` : '';
  await ElMessageBox.confirm(`Confirm order "${row.orderNo}" paid? Add ${totalAmount}${bonusText}.`, 'Confirm', { type: 'warning' });
  await memberApi.rechargeOrderPay(row.id);
  ElMessage.success('Confirmed');
  load();
}

async function cancel(row: any) {
  await ElMessageBox.confirm(`Cancel order "${row.orderNo}"?`, 'Confirm', { type: 'warning' });
  await memberApi.rechargeOrderCancel(row.id);
  ElMessage.success('Cancelled');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>Recharge Orders</h3>
      <el-select v-model="status" placeholder="All" clearable style="width: 140px" @change="load">
        <el-option v-for="(label, key) in statusMap" :key="key" :label="label" :value="key" />
      </el-select>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="orderNo" label="Order No" width="200" />
      <el-table-column prop="memberId" label="Member" width="90" />
      <el-table-column label="Amount" width="100">
        <template #default="{ row }">{{ row.amount }}</template>
      </el-table-column>
      <el-table-column label="Bonus" width="100">
        <template #default="{ row }">
          <span v-if="row.bonus > 0" style="color: #ff6b35">+{{ row.bonus }}</span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="Total" width="100">
        <template #default="{ row }">
          <strong>{{ (Number(row.amount) + Number(row.bonus || 0)).toFixed(2) }}</strong>
        </template>
      </el-table-column>
      <el-table-column label="Status" width="90">
        <template #default="{ row }">{{ statusMap[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="Remark" />
      <el-table-column prop="paidAt" label="Paid At" width="180" />
      <el-table-column prop="createdAt" label="Created" width="180" />
      <el-table-column label="Actions" width="160">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="success" @click="pay(row)">Confirm</el-button>
          <el-button v-if="row.status === 'pending'" link type="danger" @click="cancel(row)">Cancel</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>