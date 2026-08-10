<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const route = useRoute();
const router = useRouter();
const product = ref<any>(null);
const balance = ref(0);
const dialogVisible = ref(false);
const submitting = ref(false);
const form = reactive({ receiverName: '', receiverPhone: '', receiverAddress: '', remark: '' });

async function load() {
  try {
    product.value = await api.pointMallDetail(Number(route.params.id));
  } catch (e: any) {
    ElMessage.error(e.message || '商品不存在');
  }
  try {
    const p: any = await api.memberPoints();
    balance.value = p.account?.balance ?? 0;
  } catch {}
}

const enough = computed(() => product.value && balance.value >= product.value.point);
const canExchange = computed(() => !!product.value && product.value.status === 'enabled' && product.value.stock > 0);

function openDialog() {
  if (!canExchange.value) return;
  if (!enough.value) {
    ElMessage.warning('积分不足，无法兑换');
    return;
  }
  dialogVisible.value = true;
}

async function submit() {
  if (!form.receiverName || !form.receiverPhone || !form.receiverAddress) {
    ElMessage.warning('请填写完整的收货信息');
    return;
  }
  submitting.value = true;
  try {
    await api.pointExchange({
      productId: product.value.id,
      receiverName: form.receiverName,
      receiverPhone: form.receiverPhone,
      receiverAddress: form.receiverAddress,
      remark: form.remark || undefined,
    });
    ElMessage.success('兑换成功');
    dialogVisible.value = false;
    router.push('/member/points-orders');
  } catch (e: any) {
    ElMessage.error(e.message || '兑换失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div style="padding: 16px">
    <template v-if="product">
      <el-image v-if="product.cover" :src="product.cover" fit="cover" style="width: 100%; height: 220px; border-radius: 10px" />
      <div style="font-size: 20px; font-weight: 600; margin: 12px 0 4px">{{ product.name }}</div>
      <div style="display: flex; align-items: baseline; gap: 12px">
        <span style="color: #f56c6c; font-size: 22px">{{ product.point }} 积分</span>
        <span style="color: #909399; font-size: 12px">我的积分 {{ balance }}</span>
      </div>
      <div style="color: #909399; font-size: 13px; margin-top: 8px">
        剩余 {{ product.stock }} 件 · {{ product.limitPerUser ? `每人限兑 ${product.limitPerUser} 次` : '不限次数' }}
      </div>
      <div v-if="product.description" style="margin-top: 14px; color: #606266; line-height: 1.6; white-space: pre-wrap">{{ product.description }}</div>

      <div v-if="!enough" style="margin-top: 16px; color: #f56c6c; font-size: 13px">积分不足，无法兑换</div>
      <el-button
        type="primary"
        size="large"
        style="width: 100%; margin-top: 16px"
        :disabled="!canExchange"
        @click="openDialog"
      >
        {{ !enough ? '积分不足' : product.stock <= 0 ? '已兑完' : '立即兑换' }}
      </el-button>

      <el-dialog v-model="dialogVisible" title="填写收货信息" width="92%" append-to-body>
        <el-form label-position="top">
          <el-form-item label="收货人"><el-input v-model="form.receiverName" maxlength="32" placeholder="姓名" /></el-form-item>
          <el-form-item label="手机号"><el-input v-model="form.receiverPhone" maxlength="20" placeholder="联系电话" /></el-form-item>
          <el-form-item label="收货地址"><el-input v-model="form.receiverAddress" maxlength="255" type="textarea" :rows="2" placeholder="省市区 + 详细地址" /></el-form-item>
          <el-form-item label="备注（选填）"><el-input v-model="form.remark" maxlength="255" placeholder="订单备注" /></el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="submit">确认兑换（{{ product.point }} 积分）</el-button>
        </template>
      </el-dialog>
    </template>
    <el-empty v-else description="商品不存在或已下架" />
  </div>
</template>