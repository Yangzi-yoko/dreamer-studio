import { createApp } from 'vue'
import './style.css'
import 'element-plus/dist/index.css'
import './utils/flexible'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import router from './router'

createApp(App).use(createPinia()).use(router).use(ElementPlus).mount('#app')
