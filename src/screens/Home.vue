<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import { useRuntimeStore } from '../stores/runtime'
const store = useRuntimeStore()
const router = useRouter()
async function addBook(e) {
    for (let book of e.target.files) {
        await store.addBook(book)
    }
}
function gotoBook(book) {
    router.push(`/book?id=${book.id}`)
}
</script>
<template>
    <div>
        <input type="file" @change="addBook" />
        <div>
            <div v-for="book in store.books" @click="gotoBook(book)">
                <img :src="store.resourceUrl(book.id, book.manifest[book.cover].href)" class="w-[100px]" />
                <span>{{ book.title || book.publisher }}</span>
            </div>
        </div>
        <div>

        </div>
    </div>
</template>