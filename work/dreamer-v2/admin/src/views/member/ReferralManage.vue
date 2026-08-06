<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const form = reactive({ percent: 0, fixedCents: 0, enabled: false });
const rewards = ref<any[]>([]);
const rewardQuery = ref<number | null>(null);

onMounted(async () => {
  const rule: any = await memberApi.referralRule();
  if (rule) Object.assign(form, { percent: rule.percent, fixedCents: rule.fixedCents, enabled: rule.enabled });
});

async function save() {
  await memberApi.updateReferralRule({ ...form, fixedCents: Math.round(form.fixedCents * 100) });
  ElMessage.success('保存成功');
}

async function loadRewards(memberId: number) {
  const res: any = await memberApi.referralRewards(memberId, 1, 20);
  rewards.value = res.list;
}

function doQuery() {
  if (rewardQuery.value) loadRewards(rewardQuery.value);
}
</script>

<template>
  <el-card>
    <h3>推荐返利规则</h3>
    <el-form :model="form" label-width="140px" style="max-width: 480px">
      <el-form-item label="返利比例(%)"><el-input-number v-model="form.percent" :min="0" :max="100" /></el-form-item>
      <el-form-item label="固定返利(元)"><el-input-number v-model="form.fixedCents" :min="0" /></el-form-item>
      <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      <el-button type="primary" @click="save">保存</el-button>
    </el-form>
  </el-card>
  <el-card style="margin-top: 16px">
    <h3>返利流水查询</h3>
    <div style="display: flex; gap: 12px; margin-bottom: 12px">
      <el-input-number v-model="rewardQuery" :min="1" placeholder="推荐人会员ID" style="width: 180px" />
      <el-button type="primary" @click="doQuery">查询</el-button>
    </div>
    <el-table :data="rewards" border>
      <el-table-column prop="referrerMemberId" label="推荐人ID" width="100" />
      <el-table-column prop="inviteeMemberId" label="被邀请人ID" width="110" />
      <el-table-column prop="orderNo" label="订单号" width="200" />
      <el-table-column label="返利金额" width="100">
        <template #default="{ row }">¥{{ (row.rewardCents / 100).toFixed(2) }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" />
    </el-table>
  </el-card>
</template>
