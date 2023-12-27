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
async function msgCallback(event) {
    console.log('received from client', event)
    if (event.data == 'nextpage') {
        nextPage()
    } else if (event.data == 'prevpage') {
        prevPage()
    } else if (event.data.type && event.data.type == 'call') {
        let result;
        if (event.data.name == 'prompt') {
            result = await new Promise(r => {
                promptOpen.value = true
                const unwatch = watch(() => promptOpen.value, () => {
                    unwatch()
                    console.log('dialog closed', promptValue.value)
                    r(promptValue.value)
                })
            })
        } else {
            result = await api.call(event.data.name, {
                book: book.value.id,
                chap: chapid.value,
                params: event.data.params
            })
        }
        event.source.postMessage({
            type: 'call result',
            name: event.data.name,
            result
        }, '*')
    }
}

const promptOpen = ref(false)
const promptValue = ref('')
onMounted(() => {
    window.addEventListener('message', msgCallback)
})
onUnmounted(() => {
    window.removeEventListener('message', msgCallback)
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
        <DialogRoot v-model:open="promptOpen">
            <DialogPortal>
                <DialogOverlay class="bg-blackA9 data-[state=open]:animate-overlayShow fixed inset-0 z-30" />
                <DialogContent
                    class="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-[100]">
                    <DialogTitle class="text-mauve12 m-0 text-[17px] font-semibold">
                        输入
                    </DialogTitle>
                    <DialogDescription class="text-mauve11 mt-[10px] mb-5 text-[15px] leading-normal">
                        请在下面输入内容.
                    </DialogDescription>
                    <fieldset class="mb-[15px] flex items-center gap-5">
                        <input id="name" v-model="promptValue"
                            class="text-grass11 shadow-green7 focus:shadow-green8 inline-flex h-[35px] w-full flex-1 items-center justify-center rounded-[4px] px-[10px] text-[15px] leading-none shadow-[0_0_0_1px] outline-none focus:shadow-[0_0_0_2px]">
                    </fieldset>
                    <div class="mt-[25px] flex justify-end">
                        <DialogClose as-child>
                            <button
                                class="bg-green4 text-green11 hover:bg-green5 focus:shadow-green7 inline-flex h-[35px] items-center justify-center rounded-[4px] px-[15px] font-semibold leading-none focus:shadow-[0_0_0_2px] focus:outline-none">
                                OK
                            </button>
                        </DialogClose>
                    </div>
                    <DialogClose
                        class="text-grass11 hover:bg-green4 focus:shadow-green7 absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                        aria-label="Close">
                        <Icon icon="lucide:x" />
                    </DialogClose>
                </DialogContent>
            </DialogPortal>
        </DialogRoot>
    </div>
</template>