import { ref } from "vue";
import { defineStore } from "pinia";

export const useRuntimeStore = defineStore("runtime", () => {
  const books = ref([]);
  async function addBook(book) {
    const { name, path } = book;
    const result = await api.call("addBook", {
      name,
      path,
    });
    books.value.push(result);
  }
  async function load() {
    books.value = await api.call("load");
  }
  function resourceUrl(id, path) {
    const book = books.value.filter((b) => b.id == id)[0];
    //TODO fix url,port and path
    return `http://127.0.0.1:8989/${id}/OEBPS/${path}`;
  }
  load();
  return {
    books,
    addBook,
    resourceUrl,
  };
});

if (import.meta.vitest) {
  const { it, describe, expect } = import.meta.vitest;
  describe("", async () => {
    const { setActivePinia, createPinia } = await import("pinia");
    setActivePinia(createPinia());
    const store = useRuntimeStore();
    it("hello", () => {
      expect(1 + 1).toBe(2);
    });
  });
}
