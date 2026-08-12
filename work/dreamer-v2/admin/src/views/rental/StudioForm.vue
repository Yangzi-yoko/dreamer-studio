<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { rentalApi } from '../../api/rental';
import ImageUpload from '../../components/ImageUpload.vue';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const form = reactive({
  name: '', address: '', description: '', images: '',
  weekdayPriceYuan: 0, weekendPriceYuan: 0, holidayPriceYuan: 0, depositYuan: 0,
  enabled: true, sort: 0,
});

onMounted(async () => {
  if (id && id !== 'new') {
    const res: any = await rentalApi.studioPage(1, 100);
    const data = res.list.find((s: any) => s.id === Number(id));
    if (data) Object.assign(form, {
      name: data.name, address: data.address, description: data.description, images: data.images,
      weekdayPriceYuan: data.weekdayPrice, weekendPriceYuan: data.weekendPrice, holidayPriceYuan: data.holidayPrice,
      depositYuan: data.deposit, enabled: data.enabled, sort: data.sort,
    });
  }
});

async function submit() {
  if (id && id !== 'new') {
    await rentalApi.updateStudio(Number(id), form);
  } else {
    await rentalApi.createStudio(form);
  }
  ElMessage.success('保存成功');
  router.push('/rental/studios');
}
</script>

<template>
  <el-card>
    <h3>{{ id && id !== 'new' ? '编辑场地' : '新增场地' }}</h3>
    <el-form :model="form" label-width="120px" style="max-width: 560px">
      <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
      <el-form-item label="场地图片"><ImageUpload v-model="form.images" multiple :limit="9" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="form.description" type="textarea" /></el-form-item>
      <el-form-item label="工作日价(元)"><el-input-number v-model="form.weekdayPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="周末价(元)"><el-input-number v-model="form.weekendPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="节假日价(元)"><el-input-number v-model="form.holidayPriceYuan" :min="0" /></el-form-item>
      <el-form-item label="押金(元)"><el-input-number v-model="form.depositYuan" :min="0" /></el-form-item>
      <el-form-item label="排序"><el-input-number v-model="form.sort" /></el-form-item>
      <el-form-item label="上架"><el-switch v-model="form.enabled" /></el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
    </el-form>
  </el-card>
</template>
