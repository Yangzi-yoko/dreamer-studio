<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const active = ref('rule');
const form = reactive({ percent: 0, fixedCents: 0, enabled: false });

const relations = ref<any[]>([]);
const relTotal = ref(0);
const relPage = ref(1);
const relPageSize = 10;

const rewards = ref<any[]>([]);
const rewardTotal = ref(0);
const rewardPage = ref(1);
const rewardPageSize = 10;
const filterReferrer = ref<number | null>(null);

onMounted(async () => {
  const rule: any = await memberApi.referralRule();
  if (rule) Object.assign(form, { percent: rule.percent, fixedCents: rule.fixedCents / 100, enabled: rule.enabled });
  loadRelations();
  loadRewards();
});

async function save() {
  await memberApi.updateReferralRule({ percent: form.percent, fixedCents: Math.round(form.fixedCents * 100), enabled: form.enabled });
  ElMessage.success('保存成功');
}

async function loadRelations() {
  const res: any = await memberApi.referralRelations(relPage.value, relPageSize);
  relations.value = res.list;
  relTotal.value = res.total;
}

async function loadRewards() {
  const res: any = filterReferrer.value
    ? await memberApi.referralRewards(filterReferrer.value, rewardPage.value, rewardPageSize)
    : await memberApi.referralRewardsAll(rewardPage.value, rewardPageSize);
  rewards.value = res.list;
  rewardTotal.value = res.total;
}

function doQuery() {
  rewardPage.value = 1;
  loadRewards();
}

function resetQuery() {
  filterReferrer.value = null;
  rewardPage.value = 1;
  loadRewards();
}

function yuan(v: number | undefined) {
  return `¥${((v || 0) / 100).toFixed(2)}`;
}
</script>

<template>
  <el-tabs v-model="active">
    <el-tab-pane label="返利规则" name="rule">
      <el-card>
        <el-form :model="form" label-width="140px" style="max-width: 480px">
          <el-form-item label="返利比例(%)"><el-input-number v-model="form.percent" :min="0" :max="100" /></el-form-item>
          <el-form-item label="固定返利(元)"><el-input-number v-model="form.fixedCents" :min="0" /></el-form-item>
          <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
          <el-button type="primary" @click="save">保存</el-button>
        </el-form>
      </el-card>
    </el-tab-pane>

    <el-tab-pane label="推荐关系" name="relations">
      <el-card>
        <el-table :data="relations" border>
          <el-table-column prop="id" label="关系ID" width="90" />
          <el-table-column prop="referrerMemberId" label="推荐人ID" width="120" />
          <el-table-column prop="referrerNickname" label="推荐人昵称" width="140" />
          <el-table-column prop="inviteeMemberId" label="被邀请人ID" width="130" />
          <el-table-column prop="inviteeNickname" label="被邀请人昵称" width="140" />
          <el-table-column prop="createdAt" label="绑定时间" />
        </el-table>
        <el-pagination
          style="margin-top: 12px; justify-content: flex-end"
          layout="total, prev, pager, next"
          :total="relTotal"
          :page-size="relPageSize"
          :current-page="relPage"
          @current-change="(p: number) => { relPage = p; loadRelations(); }"
        />
      </el-card>
    </el-tab-pane>

    <el-tab-pane label="返利流水" name="rewards">
      <el-card>
        <div style="display: flex; gap: 12px; margin-bottom: 12px">
          <el-input-number v-model="filterReferrer" :min="1" placeholder="推荐人会员ID" style="width: 220px" />
          <el-button type="primary" @click="doQuery">筛选</el-button>
          <el-button v-if="filterReferrer" @click="resetQuery">显示全部</el-button>
        </div>
        <el-table :data="rewards" border>
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="referrerMemberId" label="推荐人ID" width="110" />
          <el-table-column prop="referrerNickname" label="推荐人昵称" width="130" />
          <el-table-column prop="inviteeMemberId" label="被邀请人ID" width="120" />
          <el-table-column prop="inviteeNickname" label="被邀请人昵称" width="130" />
          <el-table-column prop="orderNo" label="订单号" width="180" />
          <el-table-column label="订单金额" width="100">
            <template #default="{ row }">{{ yuan(row.amountCents) }}</template>
          </el-table-column>
          <el-table-column label="返利金额" width="100">
            <template #default="{ row }">{{ yuan(row.rewardCents) }}</template>
          </el-table-column>
          <el-table-column prop="createdAt" label="时间" />
        </el-table>
        <el-pagination
          style="margin-top: 12px; justify-content: flex-end"
          layout="total, prev, pager, next"
          :total="rewardTotal"
          :page-size="rewardPageSize"
          :current-page="rewardPage"
          @current-change="(p: number) => { rewardPage = p; loadRewards(); }"
        />
      </el-card>
    </el-tab-pane>
  </el-tabs>
</template>