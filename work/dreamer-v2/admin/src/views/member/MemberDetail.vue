<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { memberApi } from '../../api/member';

const route = useRoute();
const router = useRouter();
const id = route.params.id as string | undefined;
const levels = ref<any[]>([]);
const tags = ref<any[]>([]);
const form = reactive({ phone: '', nickname: '', avatar: '', levelId: undefined as number | undefined, tagIds: [] as number[] });

onMounted(async () => {
  const lres: any = await memberApi.levelPage(1, 100);
  levels.value = lres.list;
  const tres: any = await memberApi.tagPage(1, 100);
  tags.value = tres.list;
  if (id && id !== 'new') {
    const res: any = await memberApi.memberPage(1, 1000);
    const m = res.list.find((x: any) => x.id === Number(id));
    if (m) Object.assign(form, {
      phone: m.phone, nickname: m.nickname, avatar: m.avatar, levelId: m.levelId,
      tagIds: m.tags.map((t: any) => t.id),
    });
  }
});

async function submit() {
  if (id && id !== 'new') {
    await memberApi.updateMember(Number(id), form);
  } else {
    await memberApi.createMember(form);
  }
  ElMessage.success('保存成功');
  router.push('/member/members');
}
</script>

<template>
  <el-card>
    <h3>{{ id && id !== 'new' ? '会员详情' : '新增会员' }}</h3>
    <el-form :model="form" label-width="100px" style="max-width: 480px">
      <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
      <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
      <el-form-item label="头像URL"><el-input v-model="form.avatar" /></el-form-item>
      <el-form-item label="等级">
        <el-select v-model="form.levelId" clearable placeholder="选择等级">
          <el-option v-for="l in levels" :key="l.id" :label="l.name" :value="l.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="标签">
        <el-select v-model="form.tagIds" multiple placeholder="选择标签">
          <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
        </el-select>
      </el-form-item>
      <el-button type="primary" @click="submit">保存</el-button>
    </el-form>
  </el-card>
</template>
