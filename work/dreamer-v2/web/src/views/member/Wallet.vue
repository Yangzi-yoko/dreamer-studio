<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const router = useRouter();
const balance = ref(0);
const principal = ref(0);
const bonus = ref(0);
const selectedAmount = ref(0);
const remark = ref('');
const submitting = ref(false);

interface RechargeOption {
  amount: number;
  bonus: number;
  recommended?: boolean;
  label?: string;
}

const rechargeOptions = ref<RechargeOption[]>([]);

const totalBonus = computed(() => {
  const option = rechargeOptions.value.find(o => o.amount === selectedAmount.value);
  return option?.bonus || 0;
});
const totalBalance = computed(() => selectedAmount.value + totalBonus.value);

onMounted(async () => {
  try {
    const [w, rules]: any[] = await Promise.all([
      api.memberWallet(),
      api.memberRechargeRules(),
    ]);
    balance.value = w.account?.balance ?? 0;
    principal.value = w.account?.principal ?? 0;
    bonus.value = w.account?.bonus ?? 0;
    if (rules && rules.length > 0) {
      rechargeOptions.value = rules.map((r: any) => ({
        amount: r.amountYuan,
        bonus: r.bonusYuan,
        recommended: r.recommended,
        label: r.label,
      }));
    } else {
      rechargeOptions.value = [
        { amount: 99, bonus: 0 },
        { amount: 399, bonus: 50 },
        { amount: 1688, bonus: 300, recommended: true },
        { amount: 6666, bonus: 1288 },
        { amount: 9999, bonus: 1688 },
      ];
    }
  } catch {}
});

async function submit() {
  if (selectedAmount.value <= 0) {
    ElMessage.warning('Please select amount');
    return;
  }
  submitting.value = true;
  try {
    await api.memberRecharge({ amountYuan: selectedAmount.value, remark: remark.value });
    ElMessage.success('Success');
    router.push('/member');
  } catch (e: any) {
    ElMessage.error(e.message || 'Failed');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="page">
    <div class="header">
      <div class="back-btn" @click="router.back()">&#8592;</div>
      <div class="header-title">Balance Recharge</div>
      <div class="header-right"></div>
    </div>

    <div class="balance-card">
      <div class="balance-header">
        <div class="balance-label">Current Balance</div>
        <div class="balance-link" @click="router.push('/member/wallet-log')">Details &gt;</div>
      </div>
      <div class="balance-amount">{{ balance.toFixed(2) }}</div>
      <div class="balance-detail">
        <span>Principal {{ principal.toFixed(2) }}</span>
        <span class="divider">|</span>
        <span>Bonus {{ bonus.toFixed(2) }}</span>
      </div>
    </div>

    <div class="recharge-section">
      <div class="section-header">
        <div class="section-title">Recharge Amount</div>
        <div class="section-link" @click="router.push('/member/level-rules')">Rules</div>
      </div>

      <div class="amount-grid">
        <div
          v-for="option in rechargeOptions"
          :key="option.amount"
          class="amount-item"
          :class="{
            selected: selectedAmount === option.amount,
            recommended: option.recommended
          }"
          @click="selectedAmount = option.amount"
        >
          <div v-if="option.recommended" class="recommended-tag">Recommended</div>
          <div class="amount-value">{{ option.amount }}</div>
          <div v-if="option.bonus > 0" class="amount-bonus">+{{ option.bonus }} bonus</div>
        </div>
      </div>

      <div v-if="selectedAmount" class="selected-summary">
        <div class="summary-amount"> {{ selectedAmount }}</div>
        <div class="summary-detail">
          <span class="bonus-text" v-if="totalBonus > 0">Bonus {{ totalBonus.toFixed(2) }}</span>
          <span class="total-text">Total <strong>{{ totalBalance.toFixed(2) }}</strong></span>
        </div>
      </div>

      <div class="remark-section">
        <div class="remark-label">Note</div>
        <el-input v-model="remark" placeholder="Message to merchant (optional)" clearable />
      </div>
    </div>

    <div class="submit-wrapper">
      <button class="submit-btn" :disabled="submitting" @click="submit">
        {{ submitting ? 'Processing...' : 'Recharge Now' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; padding-bottom: 80px; }
.header { background: #fff; padding: 16px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
.back-btn { font-size: 20px; cursor: pointer; width: 32px; }
.header-title { font-size: 18px; font-weight: 600; color: #333; }
.header-right { width: 32px; text-align: right; color: #999; }
.balance-card { margin: 16px; padding: 24px; background: linear-gradient(135deg, #3da9fc 0%, #1e88e5 100%); border-radius: 16px; color: #fff; }
.balance-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.balance-label { font-size: 14px; opacity: 0.9; }
.balance-link { font-size: 12px; opacity: 0.8; cursor: pointer; }
.balance-amount { font-size: 40px; font-weight: 700; margin-bottom: 12px; }
.balance-detail { font-size: 13px; opacity: 0.9; display: flex; align-items: center; gap: 8px; }
.divider { opacity: 0.5; }
.recharge-section { margin: 16px; background: #fff; border-radius: 12px; padding: 16px; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title { font-size: 16px; font-weight: 600; color: #333; }
.section-link { font-size: 13px; color: #666; cursor: pointer; }
.amount-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
.amount-item { position: relative; background: #f8f8f8; border: 2px solid transparent; border-radius: 12px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.2s; }
.amount-item.selected { background: #e8f4fd; border-color: #3da9fc; }
.amount-item.recommended { background: #e8f4fd; }
.recommended-tag { position: absolute; top: -1px; left: -1px; background: #ff6b35; color: #fff; font-size: 10px; padding: 2px 8px; border-radius: 8px 0 8px 0; }
.amount-value { font-size: 24px; font-weight: 700; color: #333; margin-bottom: 4px; }
.amount-item.selected .amount-value { color: #3da9fc; }
.amount-bonus { font-size: 12px; color: #ff6b35; }
.selected-summary { background: #f8f8f8; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.summary-amount { font-size: 36px; font-weight: 700; color: #333; margin-bottom: 8px; }
.summary-detail { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.bonus-text { color: #ff6b35; }
.total-text { color: #666; }
.total-text strong { color: #3da9fc; font-size: 15px; }
.remark-section { padding: 16px 0; border-top: 1px solid #f0f0f0; }
.remark-label { font-size: 14px; color: #333; margin-bottom: 8px; }
.submit-wrapper { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: #fff; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); }
.submit-btn { width: 100%; background: linear-gradient(135deg, #3da9fc 0%, #1e88e5 100%); color: #fff; border: none; padding: 14px; border-radius: 24px; font-size: 16px; font-weight: 500; cursor: pointer; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>