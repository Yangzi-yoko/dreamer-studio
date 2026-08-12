import { createApp } from 'vue'
import './style.css'
import { createPinia } from 'pinia'
import {
  ElButton,
  ElCard,
  ElCheckbox,
  ElCheckboxGroup,
  ElDatePicker,
  ElDialog,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElImage,
  ElInput,
  ElInputNumber,
  ElOption,
  ElPagination,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTag,
} from 'element-plus'
// 按需引入组件样式，避免全量 element-plus CSS（约 350KB）
import 'element-plus/es/components/button/style/css'
import 'element-plus/es/components/card/style/css'
import 'element-plus/es/components/checkbox/style/css'
import 'element-plus/es/components/checkbox-group/style/css'
import 'element-plus/es/components/date-picker/style/css'
import 'element-plus/es/components/dialog/style/css'
import 'element-plus/es/components/empty/style/css'
import 'element-plus/es/components/form/style/css'
import 'element-plus/es/components/form-item/style/css'
import 'element-plus/es/components/image/style/css'
import 'element-plus/es/components/input/style/css'
import 'element-plus/es/components/input-number/style/css'
import 'element-plus/es/components/option/style/css'
import 'element-plus/es/components/pagination/style/css'
import 'element-plus/es/components/radio/style/css'
import 'element-plus/es/components/radio-group/style/css'
import 'element-plus/es/components/select/style/css'
import 'element-plus/es/components/tag/style/css'
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import './utils/flexible'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElButton)
app.use(ElCard)
app.use(ElCheckbox)
app.use(ElCheckboxGroup)
app.use(ElDatePicker)
app.use(ElDialog)
app.use(ElEmpty)
app.use(ElForm)
app.use(ElFormItem)
app.use(ElImage)
app.use(ElInput)
app.use(ElInputNumber)
app.use(ElOption)
app.use(ElPagination)
app.use(ElRadio)
app.use(ElRadioGroup)
app.use(ElSelect)
app.use(ElTag)
app.mount('#app')
