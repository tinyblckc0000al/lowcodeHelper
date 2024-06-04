import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'lowcodeHelper',
      component: () => import(/* webpackChunkName: 'example3' */ '../components/lowcodeHelper.vue'),
      meta: { title: '低代码', keepAlive: true }
    }
  ]
})

export default router
