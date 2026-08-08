<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const balance = ref(0);
const logs = ref<any[]>([]);
const dialogVisible = ref(false);
const loading = ref(false);
const rechargeForm = reactive({ amountYuan: 0 as number, remark: '' });

async function load() {
  try {
    const res: any = await api.memberWallet();
    balance.value = res.account?.balance ?? 0;
    logs.value = res.logs || [];
  } catch {}
}

async function submitRecharge() {
  if (!rechargeForm.amountYuan || rechargeForm.amountYuan <= 0) {
    ElMessage.warning('请输入大于 0 的充值金额');
    return;
  }
  loading.value = true;
  try {
    await api.memberWalletRecharge(rechargeForm.amountYuan, rechargeForm.remark || undefined);
    ElMessage.success('充值成功');
    dialogVisible.value = false;
    rechargeForm.amountYuan = 0;
    rechargeForm.remark = '';
    await load();
  } catch (e: any) {
    ElMessage.error(e.message || '充值失败');
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
      <el-button type="primary" @click="dialogVisible = true">充值</el-button>
    </div>
    <div style="font-size: 20px; color: #e6a23c; margin: 12px 0">余额：¥{{ balance }}</div>
    <div v-for="l in logs" :key="l.id" class="card">
      {{ l.type === 'recharge' ? '充值' : l.type === 'deduct' ? '扣费' : '退款' }} · ¥{{ l.amount }} · 余额 ¥{{ l.balanceAfter }}
      <div v-if="l.remark" style="color: #999; font-size: 12px">{{ l.remark }}</div>
    </div>
    <el-empty v-if="!logs.length" description="暂无流水" />

    <el-dialog v-model="dialogVisible" title="储值充值" width="90%">
      <el-form label-width="90px">
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeForm.amountYuan" :min="1" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="rechargeForm.remark" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submitRecharge">确认充值</el-button>
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
