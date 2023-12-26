import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./screens/Home.vue";
import Book from "./screens/Book.vue";

const routes = [
  { path: "/", component: Home },
  { path: "/book", component: Book },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
