<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { rentalApi } from '../../api/rental';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const status = ref('');
const statusMap: Record<string, string> = {
  pending: '待支付', paid: '已支付', picked: '已领取', returned: '已归还', completed: '已完成', cancelled: '已取消', refunded: '已退款',
};

async function load() {
  const res: any = await rentalApi.itemRentalPage({ page: page.value, pageSize: pageSize.value, status: status.value || undefined });
  list.value = res.list;
  total.value = res.total;
}

async function act(row: any, action: string, label: string, data?: any) {
  await rentalApi.itemRentalAction(row.id, action, data);
  ElMessage.success(`${label}成功`);
  load();
}

async function doReturn(row: any) {
  const { value } = await ElMessageBox.prompt('如有损坏请输入赔偿金额（元），无损坏填 0', '归还登记', {
    inputValue: '0',
    inputPattern: /^\d+(\.\d{1,2})?$/,
    inputErrorMessage: '请输入正确金额',
  });
  await act(row, 'return', '归还', { damageDeductYuan: Number(value) });
}

async function doExtend(row: any) {
  const { value } = await ElMessageBox.prompt(row.billingType === 'day' ? '请输入续租天数' : '请输入续租时段数', '续租', {
    inputPattern: /^[1-9]\d*$/,
    inputErrorMessage: '请输入正整数',
  });
  const data = row.billingType === 'day'
    ? { extendDays: Number(value), extendSlotCount: 0 }
    : { extendDays: 0, extendSlotCount: Number(value) };
  await act(row, 'extend', '续租', data);
}

load();
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>器材/服装订单</h3>
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="load">
        <el-option v-for="(label, key) in statusMap" :key="key" :label="label" :value="key" />
      </el-select>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="rentalNo" label="订单号" width="200" />
      <el-table-column prop="customerName" label="客户" width="90" />
      <el-table-column prop="customerPhone" label="手机号" width="130" />
      <el-table-column label="数量" width="70">
        <template #default="{ row }">{{ row.quantity }}</template>
      </el-table-column>
      <el-table-column prop="startDate" label="起租" width="110" />
      <el-table-column prop="endDate" label="应还" width="110" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ (row.totalAmountCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="押金" width="90">
        <template #default="{ row }">¥{{ (row.depositCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ statusMap[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="300">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="primary" @click="act(row, 'pay', '支付')">支付</el-button>
          <el-button v-if="row.status === 'paid'" link type="primary" @click="act(row, 'pick', '领取')">领取</el-button>
          <el-button v-if="row.status === 'picked'" link type="success" @click="doReturn(row)">归还</el-button>
          <el-button v-if="row.status === 'returned'" link type="success" @click="act(row, 'complete', '完成')">完成</el-button>
          <el-button v-if="row.status === 'paid' || row.status === 'picked'" link type="primary" @click="doExtend(row)">续租</el-button>
          <el-button v-if="row.status === 'pending'" link type="warning" @click="act(row, 'cancel', '取消')">取消</el-button>
          <el-button v-if="row.status === 'paid'" link type="danger" @click="act(row, 'refund', '退款')">退款</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
