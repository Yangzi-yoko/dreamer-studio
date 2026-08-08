<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const route = useRoute();
const router = useRouter();
const studioId = Number(route.params.studioId);
const memberId = Number(localStorage.getItem('member_id')) || 0;
const loggedIn = !!localStorage.getItem('member_token') && memberId > 0;

const slots = ref<any[]>([]);
const studio = ref<any>(null);
const walletBalance = ref(0);
const myPackages = ref<any[]>([]);
const preview = ref<any>(null);
const submitting = ref(false);

const form = reactive({
  customerName: '',
  customerPhone: localStorage.getItem('member_phone') || '',
  bookingDate: '',
  timeSlotIds: [] as number[],
  payMethod: 'wallet' as 'wallet' | 'package' | 'offline',
  userPackageId: undefined as number | undefined,
});

const enabledSlots = computed(() => slots.value.filter((s: any) => s.enabled));
const availablePackages = computed(() => myPackages.value.filter((p: any) => p.status === 'active' && p.remainingTimes > 0));

onMounted(async () => {
  try {
    const s: any = await api.studios(1, 100);
    studio.value = (s.list || []).find((x: any) => x.id === studioId);
  } catch {}
  try {
    slots.value = await api.studioTimeSlots(studioId);
  } catch {}
  if (loggedIn) {
    try {
      const w: any = await api.memberWallet();
      walletBalance.value = w.account?.balance ?? 0;
    } catch {}
    try {
      myPackages.value = (await api.myPackages()) as any[];
    } catch {}
  } else {
    form.payMethod = 'offline';
  }
});

watch(
  () => [form.bookingDate, form.timeSlotIds.join(',')],
  async () => {
    preview.value = null;
    if (!form.bookingDate || !form.timeSlotIds.length) return;
    try {
      preview.value = await api.bookingPreview({
        studioId,
        bookingDate: form.bookingDate,
        timeSlotIds: form.timeSlotIds,
      });
    } catch (e: any) {
      ElMessage.error(e.message || '计价失败');
    }
  },
);

async function submit() {
  if (!form.customerName.trim() || !/^1\d{10}$/.test(form.customerPhone)) {
    ElMessage.warning('请填写正确的客户信息');
    return;
  }
  if (!form.bookingDate || !form.timeSlotIds.length) {
    ElMessage.warning('请选择日期和时段');
    return;
  }
  if (form.payMethod === 'package' && !form.userPackageId) {
    ElMessage.warning('请选择要使用的次卡');
    return;
  }
  submitting.value = true;
  try {
    const payload: any = {
      studioId,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      bookingDate: form.bookingDate,
      timeSlotIds: form.timeSlotIds,
      payMethod: form.payMethod,
    };
    if (memberId) payload.memberId = memberId;
    if (form.payMethod === 'package') payload.userPackageId = form.userPackageId;
    await api.createBooking(payload);
    ElMessage.success(form.payMethod === 'offline' ? '下单成功，待支付' : '预订成功，已扣费');
    router.push('/orders');
  } catch (e: any) {
    ElMessage.error(e.message || '下单失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div style="padding: 16px">
    <h2>预订 {{ studio?.name || '' }}</h2>
    <el-form :model="form" label-width="80px">
      <el-form-item label="客户姓名"><el-input v-model="form.customerName" /></el-form-item>
      <el-form-item label="手机号"><el-input v-model="form.customerPhone" maxlength="11" /></el-form-item>
      <el-form-item label="日期">
        <el-date-picker v-model="form.bookingDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" />
      </el-form-item>
      <el-form-item label="时段">
        <el-checkbox-group v-model="form.timeSlotIds">
          <el-checkbox v-for="t in enabledSlots" :key="t.id" :value="t.id">
            {{ t.startTime }}-{{ t.endTime }}
          </el-checkbox>
        </el-checkbox-group>
        <div v-if="!enabledSlots.length" style="color: #999">该场地暂未配置时段</div>
      </el-form-item>

      <el-form-item v-if="loggedIn" label="储值余额">
        <span style="color: #e6a23c; font-size: 18px">¥{{ walletBalance }}</span>
      </el-form-item>
      <el-form-item v-if="preview" label="本次扣费">
        <span style="color: #f56c6c; font-size: 18px">¥{{ preview.totalAmount }}</span>
        <span style="color: #999; margin-left: 8px">（{{ preview.slotCount }} 个时段 × ¥{{ preview.unitPrice }}）</span>
      </el-form-item>

      <el-form-item v-if="loggedIn" label="支付方式">
        <el-radio-group v-model="form.payMethod">
          <el-radio value="wallet">储值余额</el-radio>
          <el-radio value="package" :disabled="!availablePackages.length">次卡</el-radio>
          <el-radio value="offline">线下支付</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="loggedIn && form.payMethod === 'package'" label="选择次卡">
        <el-select v-model="form.userPackageId" placeholder="选择次卡" style="width: 100%">
          <el-option
            v-for="p in availablePackages"
            :key="p.id"
            :value="p.id"
            :label="`次卡 #${p.packageId} · 剩余 ${p.remainingTimes} 次`"
          />
        </el-select>
      </el-form-item>

      <el-button type="primary" style="width: 100%" :loading="submitting" @click="submit">提交订单</el-button>
    </el-form>
  </div>
</template>
