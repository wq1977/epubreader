<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useRuntimeStore } from '../stores/runtime'
import TreeNode from '../components/Tree.vue'
const store = useRuntimeStore()
const route = useRoute()
console.log(route.query.id, store.books)
const book = computed(() => store.books.filter(b => b.id == route.query.id)[0])
const chapid = ref(null)
watch(() => book.value, () => {
    if (book.value) {
        console.log(book.value)
        chapid.value = route.query.chap || book.value.toc[0].href
    }
})
const chap = ref(null)
watch(() => chapid.value, async () => {
    if (chapid.value) {
    }
})

function click(node) {
    console.log(node.href)
    chapid.value = node.href
}

</script>
<template>
    <div v-if="book">
        <div> {{ book.title || book.publisher }}</div>
        <div class="flex">
            <iframe class="flex-1 h-screen" :src="store.resourceUrl(book.id, chapid)" frameborder="0"></iframe>
            <div class="w-[300px] border max-h-screen overflow-auto">
                <TreeNode :node="chap" v-on:node="click" class="p-1 cursor-pointer"
                    v-for="chap in book.toc.sort((a, b) => a.order - b.order)" />
            </div>

        </div>
    </div>
</template>