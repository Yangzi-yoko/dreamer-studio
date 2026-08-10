<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const status = ref('');
const shipVisible = ref(false);
const shipOrder = ref<any>(null);
const shipNote = ref('');

const statusText: Record<string, string> = {
  pending: '待发货',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};
const statusType: Record<string, string> = {
  pending: 'warning',
  shipped: 'primary',
  completed: 'success',
  cancelled: 'info',
};

async function load() {
  const res: any = await memberApi.pointOrdersPage(page.value, pageSize.value, status.value || undefined);
  list.value = res.list;
  total.value = res.total;
}

function openShip(row: any) {
  shipOrder.value = row;
  shipNote.value = '';
  shipVisible.value = true;
}

async function doShip() {
  await memberApi.pointOrderShip(shipOrder.value.id, { adminNote: shipNote.value || undefined });
  ElMessage.success('已发货');
  shipVisible.value = false;
  load();
}

async function complete(row: any) {
  await ElMessageBox.confirm('确认完成该订单？', '提示');
  await memberApi.pointOrderComplete(row.id);
  ElMessage.success('已完成');
  load();
}

async function cancel(row: any) {
  await ElMessageBox.confirm('确认取消该订单？取消后将自动退还消耗积分并恢复库存。', '提示', { type: 'warning' });
  await memberApi.pointOrderCancel(row.id, { reason: '后台取消' });
  ElMessage.success('已取消并退积分');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
      <h3>积分兑换订单</h3>
      <div>
        <el-select v-model="status" placeholder="全部状态" clearable style="width: 140px" @change="page = 1; load()">
          <el-option label="待发货" value="pending" />
          <el-option label="已发货" value="shipped" />
          <el-option label="已完成" value="completed" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
      </div>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column label="商品" min-width="140">
        <template #default="{ row }">{{ row.productName }}</template>
      </el-table-column>
      <el-table-column label="会员" width="160">
        <template #default="{ row }">
          {{ row.memberNickname || '未知' }}<br />
          <span style="color: #999; font-size: 12px">{{ row.memberPhone }}</span>
        </template>
      </el-table-column>
      <el-table-column label="消耗积分" width="90">
        <template #default="{ row }">
          <span style="color: #f56c6c">{{ row.point }}</span>
        </template>
      </el-table-column>
      <el-table-column label="收货信息" min-width="200">
        <template #default="{ row }">
          {{ row.receiverName }} {{ row.receiverPhone }}<br />
          <span style="color: #666">{{ row.receiverAddress }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="会员备注" min-width="120">
        <template #default="{ row }">{{ row.remark || '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType[row.status] || 'info'">{{ statusText[row.status] || row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="adminNote" label="后台备注" min-width="120">
        <template #default="{ row }">{{ row.adminNote || '-' }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="兑换时间" width="170" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button link type="primary" @click="openShip(row)">发货</el-button>
            <el-button link type="danger" @click="cancel(row)">取消退款</el-button>
          </template>
          <el-button v-if="row.status === 'shipped'" link type="success" @click="complete(row)">完成</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="shipVisible" title="确认发货" width="420">
      <el-form label-width="80px">
        <el-form-item label="商品">{{ shipOrder?.productName }}</el-form-item>
        <el-form-item label="收货信息">
          {{ shipOrder?.receiverName }} {{ shipOrder?.receiverPhone }}<br />{{ shipOrder?.receiverAddress }}
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="shipNote" placeholder="物流单号 / 备注" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipVisible = false">取消</el-button>
        <el-button type="primary" @click="doShip">确认发货</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>