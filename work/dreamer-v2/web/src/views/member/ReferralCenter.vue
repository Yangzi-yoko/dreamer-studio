<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const summary = ref<any>(null);
const team = ref<any[]>([]);
const teamTotal = ref(0);
const teamPage = ref(1);
const rewards = ref<any[]>([]);
const rewardTotal = ref(0);
const rewardPage = ref(1);
const pageSize = 10;
const bindCode = ref('');

const inviter = ref<any>(null);
const code = ref('');
const shareLink = ref('');

onMounted(async () => {
  try {
    const s: any = await api.referralSummary();
    summary.value = s;
    code.value = s.code;
    inviter.value = s.inviter;
    shareLink.value = `${location.origin}/register?inviteCode=${s.code}`;
  } catch (e: any) {
    ElMessage.error(e.message || '邀请中心加载失败');
  }
  loadTeam(1);
  loadRewards(1);
});

async function loadTeam(p: number) {
  try {
    const res: any = await api.referralTeam(p, pageSize);
    team.value = res.list;
    teamTotal.value = res.total;
    teamPage.value = p;
  } catch {}
}

async function loadRewards(p: number) {
  try {
    const res: any = await api.myReferralRewards(p, pageSize);
    rewards.value = res.list;
    rewardTotal.value = res.total;
    rewardPage.value = p;
  } catch {}
}

async function copyText(text: string, tip: string) {
  try {
    await navigator.clipboard.writeText(text);
    ElMessage.success(tip);
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
}

async function doBind() {
  if (!bindCode.value.trim()) {
    ElMessage.warning('请输入邀请码');
    return;
  }
  try {
    await api.bindReferral(bindCode.value.trim());
    ElMessage.success('绑定成功');
    inviter.value = { nickname: '已绑定' };
  } catch (e: any) {
    ElMessage.error(e.message || '绑定失败');
  }
}

function yuan(v: number | undefined) {
  return `¥${((v || 0) / 100).toFixed(2)}`;
}

function ruleDesc(rule: any) {
  if (!rule) return '当前未开启邀请返利';
  if (rule.fixedCents > 0) return `好友消费后固定返利 ${yuan(rule.fixedCents)} 至储值余额`;
  return `好友消费后按 ${rule.percent}% 返利至储值余额`;
}
</script>

<template>
  <div style="padding: 16px">
    <h2>邀请有礼</h2>

    <div class="card">
      <div style="font-size: 13px; color: #888">我的邀请码</div>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px; margin: 6px 0">{{ code }}</div>
      <el-button size="small" @click="copyText(code, '邀请码已复制')">复制邀请码</el-button>
    </div>

    <div class="card">
      <div style="font-size: 13px; color: #888">邀请链接</div>
      <div style="word-break: break-all; font-size: 12px; color: #666; margin: 6px 0">{{ shareLink }}</div>
      <el-button size="small" type="primary" @click="copyText(shareLink, '邀请链接已复制')">复制链接</el-button>
    </div>

    <div class="card">
      <div style="display: flex; gap: 12px; text-align: center">
        <div style="flex: 1">
          <div style="font-size: 24px; font-weight: 700">{{ summary?.invitedCount ?? 0 }}</div>
          <div style="font-size: 12px; color: #888">已邀请</div>
        </div>
        <div style="flex: 1">
          <div style="font-size: 24px; font-weight: 700">{{ yuan(summary?.totalRewardCents) }}</div>
          <div style="font-size: 12px; color: #888">累计返利</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="font-size: 13px; color: #888">返利规则</div>
      <div style="margin-top: 6px">{{ ruleDesc(summary?.rule) }}</div>
      <div v-if="summary?.rule" style="font-size: 12px; color: #999; margin-top: 4px">返利将自动发放至储值余额</div>
    </div>

    <div class="card" v-if="!inviter">
      <div style="font-size: 13px; color: #888">绑定邀请人</div>
      <div style="display: flex; gap: 8px; margin-top: 8px">
        <el-input v-model="bindCode" placeholder="输入朋友的邀请码" maxlength="16" />
        <el-button type="primary" @click="doBind">绑定</el-button>
      </div>
    </div>
    <div class="card" v-else-if="inviter.nickname !== '已绑定'">
      <div style="font-size: 13px; color: #888">我的邀请人</div>
      <div style="margin-top: 6px">{{ inviter.nickname }}</div>
    </div>

    <h3>我的团队</h3>
    <div v-if="team.length">
      <div v-for="t in team" :key="t.id" class="card">
        {{ t.inviteeNickname || t.inviteePhone || `会员 #${t.inviteeMemberId}` }} · {{ new Date(t.createdAt).toLocaleDateString() }}
      </div>
      <div v-if="teamTotal > pageSize" style="text-align: center; margin-top: 8px">
        <el-button size="small" link @click="loadTeam(teamPage + 1)">加载更多</el-button>
      </div>
    </div>
    <div v-else class="empty">暂无邀请记录</div>

    <h3>我的返利</h3>
    <div v-if="rewards.length">
      <div v-for="r in rewards" :key="r.id" class="card">
        <div style="display: flex; justify-content: space-between">
          <span>{{ r.inviteeNickname || `会员 #${r.inviteeMemberId}` }} 的订单</span>
          <span style="color: #f56c6c; font-weight: 600">+{{ yuan(r.rewardCents) }}</span>
        </div>
        <div style="font-size: 12px; color: #999; margin-top: 4px">{{ new Date(r.createdAt).toLocaleString() }}</div>
      </div>
      <div v-if="rewardTotal > pageSize" style="text-align: center; margin-top: 8px">
        <el-button size="small" link @click="loadRewards(rewardPage + 1)">加载更多</el-button>
      </div>
    </div>
    <div v-else class="empty">暂无返利记录</div>
  </div>
</template>

<style scoped>
.card {
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 10px;
  background: #fff;
}
.empty {
  text-align: center;
  color: #999;
  padding: 16px 0;
}
</style>