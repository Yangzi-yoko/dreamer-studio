<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const route = useRoute();
const router = useRouter();
const itemId = Number(route.params.itemId);
const item = ref<any>(null);
const loggedIn = !!sessionStorage.getItem('member_token') && Number(sessionStorage.getItem('member_id')) > 0;
const form = reactive({
  customerName: '',
  customerPhone: sessionStorage.getItem('member_phone') || '',
  billingType: 'day' as 'day' | 'slot',
  quantity: 1,
  startDate: '',
  endDate: '',
  slotCount: 1,
});

onMounted(async () => {
  try {
    const res: any = await api.items(1, 100);
    item.value = (res.list || []).find((i: any) => i.id === itemId);
    if (item.value) form.billingType = item.value.billingType;
  } catch {}
});

async function submit() {
  if (!loggedIn) {
    ElMessage.warning('请先登录后再下单');
    return;
  }
  if (!form.customerName.trim() || !/^1\d{10}$/.test(form.customerPhone)) {
    ElMessage.warning('请填写正确的客户信息');
    return;
  }
  try {
    await api.createItemRental({
      itemId,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      billingType: form.billingType,
      quantity: form.quantity,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      slotCount: form.billingType === 'slot' ? form.slotCount : 0,
    });
    ElMessage.success('下单成功，待支付');
    router.push('/rentals');
  } catch (e: any) {
    ElMessage.error(e.message || '下单失败');
  }
}
</script>

<template>
  <div style="padding: 16px">
    <h2>租用 {{ item?.name || '' }}</h2>
    <el-form :model="form" label-width="80px">
      <el-form-item label="客户姓名"><el-input v-model="form.customerName" /></el-form-item>
      <el-form-item label="手机号"><el-input v-model="form.customerPhone" maxlength="11" /></el-form-item>
      <el-form-item label="数量"><el-input-number v-model="form.quantity" :min="1" /></el-form-item>
      <template v-if="form.billingType === 'day'">
        <el-form-item label="开始日期">
          <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="结束日期">
          <el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item label="使用日期">
          <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="时段数"><el-input-number v-model="form.slotCount" :min="1" /></el-form-item>
      </template>
      <el-button type="primary" style="width: 100%" @click="submit">提交订单</el-button>
    </el-form>
  </div>
</template>
