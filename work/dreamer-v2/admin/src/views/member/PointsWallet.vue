<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const phone = ref('');
const member = ref<any>(null);
const pointsAccount = ref<any>(null);
const walletAccount = ref<any>(null);
const pointsLogs = ref<any[]>([]);
const walletLogs = ref<any[]>([]);
const loading = ref(false);

const pointsForm = ref({ points: 0, remark: '' });
const walletForm = ref({ amountYuan: 0, remark: '' });
const pointsOp = ref<'earn' | 'spend'>('earn');
const walletOp = ref<'recharge' | 'deduct' | 'refund'>('recharge');

async function search() {
  if (!/^1\d{10}$/.test(phone.value)) {
    ElMessage.warning('请输入正确的手机号');
    return;
  }
  loading.value = true;
  try {
    const res: any = await memberApi.memberPage(1, 1000);
    const m = res.list.find((x: any) => x.phone === phone.value);
    if (!m) {
      ElMessage.warning('未找到该会员');
      member.value = null;
      pointsAccount.value = null;
      walletAccount.value = null;
      pointsLogs.value = [];
      walletLogs.value = [];
      return;
    }
    member.value = m;
    await loadAccounts(m.id);
  } finally {
    loading.value = false;
  }
}

async function loadAccounts(memberId: number) {
  const [p, w]: any = await Promise.all([
    memberApi.pointsDetail(memberId, 1, 20),
    memberApi.walletDetail(memberId, 1, 20),
  ]);
  pointsAccount.value = p.account;
  pointsLogs.value = p.logs?.list ?? [];
  walletAccount.value = w.account;
  walletLogs.value = w.logs ?? [];
}

async function submitPoints() {
  if (!member.value) return;
  if (pointsForm.value.points <= 0) {
    ElMessage.warning('请输入大于 0 的积分');
    return;
  }
  await (pointsOp.value === 'earn'
    ? memberApi.pointsEarn(member.value.id, pointsForm.value)
    : memberApi.pointsSpend(member.value.id, pointsForm.value));
  ElMessage.success('操作成功');
  pointsForm.value = { points: 0, remark: '' };
  await loadAccounts(member.value.id);
}

async function submitWallet() {
  if (!member.value) return;
  if (walletForm.value.amountYuan <= 0) {
    ElMessage.warning('请输入大于 0 的金额');
    return;
  }
  const payload = { amountYuan: walletForm.value.amountYuan, remark: walletForm.value.remark };
  await (walletOp.value === 'recharge'
    ? memberApi.walletRecharge(member.value.id, payload)
    : walletOp.value === 'deduct'
      ? memberApi.walletDeduct(member.value.id, payload)
      : memberApi.walletRefund(member.value.id, payload));
  ElMessage.success('操作成功');
  walletForm.value = { amountYuan: 0, remark: '' };
  await loadAccounts(member.value.id);
}
</script>

<template>
  <el-card>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px">
      <h3 style="margin: 0">积分 / 储值</h3>
      <el-input v-model="phone" placeholder="输入会员手机号" style="width: 220px" clearable @keyup.enter="search" />
      <el-button type="primary" :loading="loading" @click="search">查询</el-button>
    </div>

    <template v-if="member">
      <el-descriptions :column="4" border style="margin-bottom: 16px">
        <el-descriptions-item label="手机号">{{ member.phone }}</el-descriptions-item>
        <el-descriptions-item label="昵称">{{ member.nickname || '-' }}</el-descriptions-item>
        <el-descriptions-item label="累计消费">¥{{ member.totalSpend }}</el-descriptions-item>
        <el-descriptions-item label="订单数">{{ member.totalOrders }}</el-descriptions-item>
        <el-descriptions-item label="积分余额">{{ pointsAccount?.balance ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="储值余额">¥{{ walletAccount?.balance ?? 0 }}</el-descriptions-item>
      </el-descriptions>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>积分调整</template>
            <el-form label-width="70px">
              <el-form-item label="操作">
                <el-radio-group v-model="pointsOp">
                  <el-radio-button label="earn">增加</el-radio-button>
                  <el-radio-button label="spend">扣减</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="积分"><el-input-number v-model="pointsForm.points" :min="1" /></el-form-item>
              <el-form-item label="备注"><el-input v-model="pointsForm.remark" placeholder="可选" /></el-form-item>
              <el-button type="primary" @click="submitPoints">提交</el-button>
            </el-form>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>储值操作</template>
            <el-form label-width="70px">
              <el-form-item label="操作">
                <el-radio-group v-model="walletOp">
                  <el-radio-button label="recharge">充值</el-radio-button>
                  <el-radio-button label="deduct">扣款</el-radio-button>
                  <el-radio-button label="refund">退款</el-radio-button>
                </el-radio-group>
              </el-form-item>
              <el-form-item label="金额(元)"><el-input-number v-model="walletForm.amountYuan" :min="0.01" :precision="2" /></el-form-item>
              <el-form-item label="备注"><el-input v-model="walletForm.remark" placeholder="可选" /></el-form-item>
              <el-button type="primary" @click="submitWallet">提交</el-button>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top: 16px">
        <el-col :span="12">
          <h4>积分流水</h4>
          <el-table :data="pointsLogs" border size="small" max-height="360">
            <el-table-column prop="type" label="类型" width="80" />
            <el-table-column prop="points" label="积分" width="80" />
            <el-table-column prop="balanceAfter" label="变动后" width="90" />
            <el-table-column prop="remark" label="备注" />
            <el-table-column prop="createdAt" label="时间" width="170" />
          </el-table>
        </el-col>
        <el-col :span="12">
          <h4>储值流水</h4>
          <el-table :data="walletLogs" border size="small" max-height="360">
            <el-table-column prop="type" label="类型" width="90" />
            <el-table-column label="金额" width="90">
              <template #default="{ row }">¥{{ row.amount }}</template>
            </el-table-column>
            <el-table-column label="变动后" width="100">
              <template #default="{ row }">¥{{ row.balanceAfter }}</template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" />
            <el-table-column prop="createdAt" label="时间" width="170" />
          </el-table>
        </el-col>
      </el-row>
    </template>
  </el-card>
</template>
