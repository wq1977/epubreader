<script setup>
import { useRouter, useRoute } from 'vue-router'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useRuntimeStore } from '../stores/runtime'
import TreeNode from '../components/Tree.vue'
const store = useRuntimeStore()
const route = useRoute()
const book = computed(() => store.books.filter(b => b.id == route.query.id)[0])
const chapid = ref(null)
watch(() => book.value, () => {
    if (book.value) {
        console.log(book.value)
        chapid.value = route.query.chap || book.value.toc[0].href
    }
})

function click(node) {
    chapid.value = node.href
}

onMounted(() => {
    function nextPage() {
        if (!chapid.value) return;
        for (let i = 0; i < book.value.flow.length - 1; i++) {
            const cleanFlowHref = book.value.manifest[book.value.flow[i]].href.split('#')[0]
            const cleanCurrentHref = chapid.value.split('#')[0]
            if (cleanFlowHref == cleanCurrentHref) {
                chapid.value = book.value.manifest[book.value.flow[i + 1]].href
                break
            }
        }
    }
    function prevPage() {
        if (!chapid.value) return;
        for (let i = 1; i < book.value.flow.length; i++) {
            const cleanFlowHref = book.value.manifest[book.value.flow[i]].href.split('#')[0]
            const cleanCurrentHref = chapid.value.split('#')[0]
            if (cleanFlowHref == cleanCurrentHref) {
                chapid.value = book.value.manifest[book.value.flow[i - 1]].href
                break
            }
        }
    }

    window.addEventListener('message', async function (event) {
        console.log('received from client', event)
        if (event.data == 'nextpage') {
            nextPage()
        } else if (event.data == 'prevpage') {
            prevPage()
        } else if (event.data.type && event.data.type == 'call') {
            const result = await api.call(event.data.name, ...event.data.params)
            console.log('api call in parent got', result)
            event.source.postMessage({
                type: 'call result',
                name: event.data.name,
                result
            }, '*')
        }
    })
})
</script>
<template>
    <div v-if="book">
        <div class="flex">
            <div class="w-[300px] border max-h-screen overflow-auto">
                <TreeNode :node="chap" v-on:node="click" class="p-1 cursor-pointer"
                    v-for="chap in book.toc.sort((a, b) => a.order - b.order)" />
            </div>
            <iframe v-if="chapid" class="flex-1 h-screen border p-5" :src="store.resourceUrl(book.id, chapid)"
                frameborder="0"></iframe>
        </div>
    </div>
</template>