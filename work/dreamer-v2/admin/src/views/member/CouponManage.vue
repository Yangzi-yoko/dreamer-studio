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
const form = reactive({ name: '', type: 'amount' as 'amount' | 'discount', valueYuan: 0, valueDiscount: 0, minSpendYuan: 0, totalCount: 100, enabled: true });

async function load() {
  const res: any = await memberApi.couponPage(page.value, pageSize.value);
  list.value = res.list;
  total.value = res.total;
}

function resetForm() {
  Object.assign(form, { name: '', type: 'amount', valueYuan: 0, valueDiscount: 0, minSpendYuan: 0, totalCount: 100, enabled: true });
}

function openCreate() {
  editingId.value = null;
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  resetForm();
  Object.assign(form, {
    name: row.name,
    type: row.type,
    minSpendYuan: row.minSpend,
    totalCount: row.totalCount,
    enabled: row.enabled,
  });
  if (row.type === 'amount') {
    form.valueYuan = row.value / 100;
  } else {
    form.valueDiscount = row.value / 10;
  }
  dialogVisible.value = true;
}

function buildPayload() {
  return {
    name: form.name,
    type: form.type,
    value: form.type === 'amount' ? Math.round(form.valueYuan * 100) : Math.round(form.valueDiscount * 10),
    minSpendYuan: form.minSpendYuan,
    totalCount: form.totalCount,
    enabled: form.enabled,
  };
}

async function submit() {
  if (editingId.value) {
    await memberApi.updateCoupon(editingId.value, buildPayload());
  } else {
    await memberApi.createCoupon(buildPayload());
  }
  ElMessage.success('保存成功');
  dialogVisible.value = false;
  load();
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除优惠券「${row.name}」？`, '提示');
  await memberApi.deleteCoupon(row.id);
  ElMessage.success('已删除');
  load();
}

const memberId = ref<number | null>(null);
const userCoupons = ref<any[]>([]);

async function loadUserCoupons() {
  if (!memberId.value) {
    ElMessage.warning('请输入会员 ID');
    return;
  }
  userCoupons.value = await memberApi.couponUsers(memberId.value);
}

async function issue(couponId: number) {
  if (!memberId.value) {
    ElMessage.warning('请先输入会员 ID');
    return;
  }
  await memberApi.couponIssue(couponId, { memberId: memberId.value });
  ElMessage.success('发券成功');
  load();
  loadUserCoupons();
}

async function useCoupon(row: any) {
  if (!memberId.value) return;
  const { value } = await ElMessageBox.prompt('输入订单号与订单金额(元)，用逗号分隔', '核销优惠券', {
    inputPattern: /^.+,\d+(\.\d{1,2})?$/,
    inputErrorMessage: '格式：订单号,金额(元)',
  });
  const [orderNo, amount] = value.split(',');
  await memberApi.couponUse(row.id, { memberId: memberId.value, orderNo, amountYuan: Number(amount) });
  ElMessage.success('使用成功');
  loadUserCoupons();
}

onMounted(load);
</script>

<template>
  <el-card>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <h3>优惠券管理</h3>
      <el-button type="primary" @click="openCreate">新增优惠券</el-button>
    </div>
    <el-table :data="list" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ row.type === 'amount' ? '满减' : '折扣' }}</template>
      </el-table-column>
      <el-table-column label="面值" width="100">
        <template #default="{ row }">
          {{ row.type === 'amount' ? `¥${row.value / 100}` : `${row.value / 10}折` }}
        </template>
      </el-table-column>
      <el-table-column label="使用门槛" width="110">
        <template #default="{ row }">满 ¥{{ row.minSpend }}</template>
      </el-table-column>
      <el-table-column label="已发/总量" width="100">
        <template #default="{ row }">{{ row.issuedCount }}/{{ row.totalCount }}</template>
      </el-table-column>
      <el-table-column label="启用" width="70">
        <template #default="{ row }">{{ row.enabled ? '是' : '否' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
          <el-button link type="success" @click="issue(row.id)">发券</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="prev, pager, next" @current-change="load" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑优惠券' : '新增优惠券'" width="480">
      <el-form :model="form" label-width="120px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio-button label="amount">满减</el-radio-button>
            <el-radio-button label="discount">折扣</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.type === 'amount'" label="满减金额(元)">
          <el-input-number v-model="form.valueYuan" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item v-else label="折扣(折数)">
          <el-input-number v-model="form.valueDiscount" :min="1" :max="10" />
        </el-form-item>
        <el-form-item label="使用门槛(元)"><el-input-number v-model="form.minSpendYuan" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="发行总量"><el-input-number v-model="form.totalCount" :min="1" /></el-form-item>
        <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-divider />
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
      <h3 style="margin: 0">会员优惠券</h3>
      <el-input-number v-model="memberId" :min="1" placeholder="会员 ID" />
      <el-button type="primary" @click="loadUserCoupons">查询</el-button>
    </div>
    <el-table :data="userCoupons" border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="couponId" label="券模板" width="90" />
      <el-table-column prop="status" label="状态" width="90" />
      <el-table-column prop="usedAt" label="使用时间" width="170" />
      <el-table-column prop="createdAt" label="领取时间" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button link type="success" :disabled="row.status !== 'unused'" @click="useCoupon(row)">核销</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>
