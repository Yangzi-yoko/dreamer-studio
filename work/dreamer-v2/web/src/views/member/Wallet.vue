<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const balance = ref(0);
const logs = ref<any[]>([]);
const orders = ref<any[]>([]);
const dialogVisible = ref(false);
const loading = ref(false);
const step = ref<'form' | 'order'>('form');
const currentOrder = ref<any>(null);
const rechargeForm = reactive({ amountYuan: 0 as number, remark: '' });
const statusMap: Record<string, string> = { pending: '待支付', paid: '已到账', cancelled: '已取消' };

async function load() {
  try {
    const res: any = await api.memberWallet();
    balance.value = res.account?.balance ?? 0;
    logs.value = res.logs || [];
  } catch {}
  try {
    orders.value = (await api.myRechargeOrders()) as any[];
  } catch {}
}

function openDialog() {
  step.value = 'form';
  currentOrder.value = null;
  rechargeForm.amountYuan = 0;
  rechargeForm.remark = '';
  dialogVisible.value = true;
}

async function createOrder() {
  if (!rechargeForm.amountYuan || rechargeForm.amountYuan <= 0) {
    ElMessage.warning('请输入大于 0 的充值金额');
    return;
  }
  loading.value = true;
  try {
    currentOrder.value = await api.createRechargeOrder(rechargeForm.amountYuan, rechargeForm.remark || undefined);
    step.value = 'order';
  } catch (e: any) {
    ElMessage.error(e.message || '创建订单失败');
  } finally {
    loading.value = false;
  }
}

async function payOrder() {
  if (!currentOrder.value) return;
  loading.value = true;
  try {
    await api.payRechargeOrder(currentOrder.value.id);
    ElMessage.success('充值成功，已到账');
    dialogVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e.message || '支付失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <h2 style="margin: 0">储值明细</h2>
      <el-button type="primary" @click="openDialog">充值</el-button>
    </div>
    <div style="font-size: 20px; color: #e6a23c; margin: 12px 0">余额：¥{{ balance }}</div>

    <h3>充值订单</h3>
    <div v-for="o in orders" :key="o.id" class="card">
      {{ o.orderNo }} · ¥{{ (o.amountCents / 100).toFixed(2) }}
      <el-tag size="small" :type="o.status === 'paid' ? 'success' : o.status === 'pending' ? 'warning' : 'info'">
        {{ statusMap[o.status] || o.status }}
      </el-tag>
      <div v-if="o.remark" style="color: #999; font-size: 12px">{{ o.remark }}</div>
    </div>
    <el-empty v-if="!orders.length" description="暂无充值订单" />

    <h3>储值流水</h3>
    <div v-for="l in logs" :key="l.id" class="card">
      {{ l.type === 'recharge' ? '充值' : l.type === 'deduct' ? '扣费' : '退款' }} · ¥{{ l.amount }} · 余额 ¥{{ l.balanceAfter }}
      <div v-if="l.remark" style="color: #999; font-size: 12px">{{ l.remark }}</div>
    </div>
    <el-empty v-if="!logs.length" description="暂无流水" />

    <el-dialog v-model="dialogVisible" title="储值充值" width="90%">
      <template v-if="step === 'form'">
        <el-form label-width="90px">
          <el-form-item label="充值金额">
            <el-input-number v-model="rechargeForm.amountYuan" :min="1" :precision="2" style="width: 100%" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="rechargeForm.remark" placeholder="可选" />
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%" :loading="loading" @click="createOrder">提交充值订单</el-button>
      </template>
      <template v-else-if="currentOrder">
        <div style="text-align: center; padding: 12px 0">
          <div style="color: #999">充值订单已创建，请确认支付</div>
          <div style="font-size: 22px; color: #e6a23c; margin: 8px 0">¥{{ (currentOrder.amountCents / 100).toFixed(2) }}</div>
          <div style="color: #999; font-size: 12px">订单号：{{ currentOrder.orderNo }}</div>
        </div>
        <el-button type="primary" style="width: 100%" :loading="loading" @click="payOrder">确认支付</el-button>
      </template>
    </el-dialog>
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
