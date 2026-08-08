<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const status = ref('');
const statusMap: Record<string, string> = { pending: '待支付', paid: '已到账', cancelled: '已取消' };

async function load() {
  const res: any = await memberApi.rechargeOrdersPage(page.value, pageSize.value, status.value || undefined);
  list.value = res.list;
  total.value = res.total;
}

async function pay(row: any) {
  await ElMessageBox.confirm(`确认「${row.orderNo}」已支付到账？将增加会员储值余额 ¥${row.amount}。`, '确认到账', { type: 'warning' });
  await memberApi.rechargeOrderPay(row.id);
  ElMessage.success('已确认到账');
  load();
}

async function cancel(row: any) {
  await ElMessageBox.confirm(`确定取消充值订单「${row.orderNo}」？`, '提示', { type: 'warning' });
  await memberApi.rechargeOrderCancel(row.id);
  ElMessage.success('已取消');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>充值订单管理</h3>
      <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="load">
        <el-option v-for="(label, key) in statusMap" :key="key" :label="label" :value="key" />
      </el-select>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="orderNo" label="订单号" width="200" />
      <el-table-column prop="memberId" label="会员ID" width="90" />
      <el-table-column label="金额" width="100">
        <template #default="{ row }">¥{{ row.amount }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">{{ statusMap[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column prop="paidAt" label="到账时间" width="180" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button v-if="row.status === 'pending'" link type="success" @click="pay(row)">确认到账</el-button>
          <el-button v-if="row.status === 'pending'" link type="danger" @click="cancel(row)">取消</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />
  </el-card>
</template>
