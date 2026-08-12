<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: '', totalHours: 1, priceYuan: 0, enabled: true });

async function load() {
  const res: any = await memberApi.packagePage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', totalHours: 1, priceYuan: 0, enabled: true });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, totalHours: row.totalHours, priceYuan: row.price, enabled: row.enabled });
  dialogVisible.value = true;
}

async function submit() {
  const payload = { ...form, totalMinutes: Math.round(form.totalHours * 60) };
  if (editingId.value) {
    await memberApi.updatePackage(editingId.value, payload);
  } else {
    await memberApi.createPackage(payload);
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除计时卡「${row.name}」？`, '提示');
  await memberApi.deletePackage(row.id);
  ElMessage.success('已删除');
  load();
}

const memberId = ref<number | null>(null);
const userPackages = ref<any[]>([]);

async function loadUserPackages() {
  if (!memberId.value) {
    ElMessage.warning('请输入会员 ID');
    return;
  }
  userPackages.value = await memberApi.packageUsers(memberId.value);
}

async function buy(cardId: number) {
  if (!memberId.value) {
    ElMessage.warning('请先输入会员 ID');
    return;
  }
  await memberApi.packageBuy(cardId, { memberId: memberId.value });
  ElMessage.success('购买成功');
  loadUserPackages();
}

async function useCard(row: any) {
  if (!memberId.value) return;
  try {
    const { value } = await ElMessageBox.prompt('核销时长（小时）', `核销「${row.id}」计时卡`, {
      inputValue: '1',
      inputPattern: /^\d+(\.\d+)?$/,
      inputErrorMessage: '请输入正确的时长',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    const minutes = Math.round(Number(value) * 60);
    await memberApi.packageUse(row.id, { memberId: memberId.value, minutes });
    ElMessage.success('核销成功');
    loadUserPackages();
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '核销失败');
  }
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>计时卡 / 套餐管理</h3>
      <el-button type="primary" @click="openCreate">新增计时卡</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="totalHours" label="总时长(小时)" width="110" />
      <el-table-column label="价格" width="110">
        <template #default="{ row }">¥{{ row.price }}</template>
      </el-table-column>
      <el-table-column label="启用" width="80">
        <template #default="{ row }">{{ row.enabled ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
          <el-button link type="success" @click="buy(row.id)">购买</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑计时卡' : '新增计时卡'" width="460">
      <el-form :model="form" label-width="100px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="总时长(小时)"><el-input-number v-model="form.totalHours" :min="0.5" :step="0.5" :precision="1" /></el-form-item>
        <el-form-item label="价格(元)"><el-input-number v-model="form.priceYuan" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-divider />
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
      <h3 style="margin: 0">会员计时卡</h3>
      <el-input-number v-model="memberId" :min="1" placeholder="会员 ID" />
      <el-button type="primary" @click="loadUserPackages">查询</el-button>
    </div>
    <el-table :data="userPackages" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="packageId" label="计时卡模板" width="110" />
      <el-table-column prop="remainingHours" label="剩余时长(小时)" width="130" />
      <el-table-column prop="status" label="状态" width="90" />
      <el-table-column prop="expiresAt" label="到期时间" width="120" />
      <el-table-column prop="createdAt" label="购买时间" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="success" :disabled="row.status !== 'active' || row.remainingHours <= 0" @click="useCard(row)">核销</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
