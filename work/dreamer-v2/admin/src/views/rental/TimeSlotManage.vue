<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';

const route = useRoute();
const studioId = Number(route.params.id);
const slots = ref<any[]>([]);

onMounted(async () => {
  slots.value = (await rentalApi.listTimeSlots(studioId)) as any[];
});

function add() {
  slots.value.push({ startTime: '09:00', endTime: '10:00', enabled: true });
}

function remove(idx: number) {
  slots.value.splice(idx, 1);
}

async function save() {
  await rentalApi.saveTimeSlots(studioId, slots.value);
  ElMessage.success('时段已保存');
}
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>时段档期</h3>
      <div>
        <el-button @click="add">新增时段</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </div>
    </div>
    <el-table :data="slots" border>
      <el-table-column label="开始" width="140">
        <template #default="{ row }"><el-time-select v-model="row.startTime" start="00:00" end="23:30" step="00:30" /></template>
      </el-table-column>
      <el-table-column label="结束" width="140">
        <template #default="{ row }"><el-time-select v-model="row.endTime" start="00:30" end="23:59" step="00:30" /></template>
      </el-table-column>
      <el-table-column label="启用" width="100">
        <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ $index }"><el-button link type="danger" @click="remove($index)">删除</el-button></template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
