<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import request from '../api/request';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    multiple?: boolean;
    limit?: number;
  }>(),
  {
    modelValue: '',
    multiple: false,
    limit: 1,
  },
);

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();
const uploading = ref(false);

const list = computed<string[]>(() =>
  (props.modelValue || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),
);

const canAdd = computed(() => !uploading.value && list.value.length < props.limit);

function setList(next: string[]) {
  emit('update:modelValue', [...new Set(next.filter(Boolean))].join(','));
}

async function upload(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  uploading.value = true;
  try {
    const res: any = await request.post('/upload/image', fd);
    const url = res?.url;
    if (!url) throw new Error('上传失败');
    const next = props.multiple ? [...list.value, url] : [url];
    setList(next.slice(0, props.limit));
    ElMessage.success('上传成功');
  } catch (e: any) {
    ElMessage.error(e?.message || '上传失败');
  } finally {
    uploading.value = false;
  }
}

function handleChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) upload(file);
  input.value = '';
}

function remove(url: string) {
  setList(list.value.filter((u) => u !== url));
}
</script>

<template>
  <div>
    <div class="image-upload__list">
      <div v-for="(url, i) in list" :key="url" class="image-upload__item">
        <el-image
          :src="url"
          fit="cover"
          :preview-src-list="list"
          :initial-index="i"
          preview-teleported
          class="image-upload__preview"
        />
        <div class="image-upload__remove" title="移除" @click="remove(url)">×</div>
      </div>
      <label v-if="canAdd" class="image-upload__add">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          @change="handleChange"
        />
        <span>{{ uploading ? '上传中…' : '+ 上传图片' }}</span>
      </label>
    </div>
    <div class="image-upload__hint">支持 jpg / png / webp / gif，单张不超过 10MB</div>
  </div>
</template>

<style scoped>
.image-upload__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-upload__item {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.image-upload__preview {
  width: 100%;
  height: 100%;
  display: block;
}

.image-upload__remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  line-height: 18px;
  text-align: center;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  border-radius: 0 0 0 6px;
  user-select: none;
}

.image-upload__add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border: 1px dashed #c0c4cc;
  border-radius: 6px;
  color: #909399;
  font-size: 13px;
  cursor: pointer;
  background: #fafafa;
  text-align: center;
}

.image-upload__add input {
  display: none;
}

.image-upload__hint {
  color: #909399;
  font-size: 12px;
  margin-top: 6px;
}
</style>
