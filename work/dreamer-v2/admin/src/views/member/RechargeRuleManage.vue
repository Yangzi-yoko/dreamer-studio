<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { memberApi } from '../../api/member';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const dialogVisible = ref(false);
const editingId = ref<number | null>(null);

const form = reactive({
  amountYuan: 0,
  bonusYuan: 0,
  label: '',
  recommended: false,
  enabled: true,
  sort: 0,
});

async function load() {
  loading.value = true;
  try {
    const res: any = await memberApi.rechargeRulePage(1, 50);
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, { amountYuan: 0, bonusYuan: 0, label: '', recommended: false, enabled: true, sort: 0 });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    amountYuan: row.amountYuan,
    bonusYuan: row.bonusYuan,
    label: row.label || '',
    recommended: row.recommended,
    enabled: row.enabled,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

async function submit() {
  if (!form.amountYuan || form.amountYuan <= 0) {
    ElMessage.warning('充值金额必须大于0');
    return;
  }
  if (form.bonusYuan < 0) {
    ElMessage.warning('赠送金额不能为负');
    return;
  }
  if (editingId.value) {
    await memberApi.rechargeRuleUpdate(editingId.value, form);
    ElMessage.success('更新成功');
  } else {
    await memberApi.rechargeRuleCreate(form);
    ElMessage.success('创建成功');
  }
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm('确定删除该充值规则？', '提示', { type: 'warning' });
  await memberApi.rechargeRuleDelete(row.id);
  ElMessage.success('已删除');
  load();
}

async function toggleEnabled(row: any) {
  await memberApi.rechargeRuleUpdate(row.id, { enabled: !row.enabled });
  ElMessage.success(row.enabled ? '已禁用' : '已启用');
  load();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
      <h3 style="margin: 0">充值规则管理</h3>
      <el-button type="primary" @click="openCreate">新增规则</el-button>
    </div>
    <el-table :data="list" border v-loading="loading">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="充值金额" width="120">
        <template #default="{ row }">
          <strong style="color: #3da9fc; font-size: 16px">¥{{ row.amountYuan }}</strong>
        </template>
      </el-table-column>
      <el-table-column label="赠送金额" width="120">
        <template #default="{ row }">
          <span v-if="row.bonusYuan > 0" style="color: #ff6b35; font-weight: 600">+¥{{ row.bonusYuan }}</span>
          <span v-else style="color: #999">-</span>
        </template>
      </el-table-column>
      <el-table-column label="实际到账" width="120">
        <template #default="{ row }"><strong>¥{{ (row.amountYuan + row.bonusYuan).toFixed(2) }}</strong></template>
      </el-table-column>
      <el-table-column label="标签" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.recommended" type="danger" size="small">商家推荐</el-tag>
          <span v-else-if="row.label">{{ row.label }}</span>
          <span v-else style="color: #999">-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.enabled ? 'warning' : 'success'" @click="toggleEnabled(row)">{{ row.enabled ? '禁用' : '启用' }}</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑充值规则' : '新增充值规则'" width="480px">
      <el-form label-width="100px">
        <el-form-item label="充值金额">
          <el-input-number v-model="form.amountYuan" :min="1" :precision="2" style="width: 200px" />
          <span style="margin-left: 8px; color: #666">元</span>
        </el-form-item>
        <el-form-item label="赠送金额">
          <el-input-number v-model="form.bonusYuan" :min="0" :precision="2" style="width: 200px" />
          <span style="margin-left: 8px; color: #666">元</span>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.label" placeholder="如：大额优惠、新客专享" clearable />
        </el-form-item>
        <el-form-item label="商家推荐">
          <el-switch v-model="form.recommended" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :step="1" style="width: 120px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>
