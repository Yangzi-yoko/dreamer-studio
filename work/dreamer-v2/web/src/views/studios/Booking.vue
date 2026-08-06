<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();
const studioId = Number(route.params.id);
const slots = ref<any[]>([]);
const enabledSlots = computed(() => slots.value.filter((s: any) => s.enabled));
const studio = ref<any>(null);
const form = reactive({
  customerName: '',
  customerPhone: localStorage.getItem('member_phone') || '',
  bookingDate: '',
  timeSlotIds: [] as number[],
});

onMounted(async () => {
  try {
    const s: any = await api.studios(1, 100);
    studio.value = (s.list || []).find((x: any) => x.id === studioId);
  } catch {}
  try {
    slots.value = await api.studioTimeSlots(studioId);
  } catch {}
});

async function submit() {
  if (!form.customerName.trim() || !/^1\d{10}$/.test(form.customerPhone)) {
    ElMessage.warning('请填写正确的客户信息');
    return;
  }
  if (!form.bookingDate || !form.timeSlotIds.length) {
    ElMessage.warning('请选择日期和时段');
    return;
  }
  try {
    await api.createBooking({
      studioId,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      bookingDate: form.bookingDate,
      timeSlotIds: form.timeSlotIds,
      memberId: Number(localStorage.getItem('member_id')) || undefined,
    });
    ElMessage.success('下单成功，待支付');
    router.push('/orders');
  } catch (e: any) {
    ElMessage.error(e.message || '下单失败');
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
      </el-form-item>
      <el-button type="primary" style="width: 100%" @click="submit">提交订单</el-button>
    </el-form>
  </div>
</template>
