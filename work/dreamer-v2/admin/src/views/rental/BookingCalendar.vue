<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { rentalApi } from '../../api/rental';

const studios = ref<any[]>([]);
const studioId = ref<number | null>(null);
const month = ref(new Date().toISOString().slice(0, 7));
const days = ref<any[]>([]);

onMounted(async () => {
  const res: any = await rentalApi.studioPage(1, 100);
  studios.value = res.list;
  if (studios.value.length) {
    studioId.value = studios.value[0].id;
    await loadCalendar();
  }
});

async function loadCalendar() {
  if (!studioId.value) return;
  days.value = (await rentalApi.calendar(studioId.value, month.value)) as any[];
}
</script>

<template>
  <el-card>
    <h3>档期日历</h3>
    <div style="display: flex; gap: 12px; margin-bottom: 12px">
      <el-select v-model="studioId" placeholder="选择场地" @change="loadCalendar">
        <el-option v-for="s in studios" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
      <el-date-picker v-model="month" type="month" value-format="YYYY-MM" @change="loadCalendar" />
    </div>
    <el-table :data="days" border max-height="560">
      <el-table-column prop="date" label="日期" width="120" />
      <el-table-column label="占用时段数" width="110">
        <template #default="{ row }">
          <el-tag :type="row.occupiedTimeSlotIds.length ? 'danger' : 'success'">{{ row.occupiedTimeSlotIds.length }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="订单">
        <template #default="{ row }">
          <div v-for="b in row.bookings" :key="b.id" style="line-height: 1.8">
            {{ b.bookingNo }} · {{ b.customerName }} · {{ b.status }}
          </div>
          <span v-if="!row.bookings.length">空闲</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
