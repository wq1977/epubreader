<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useRuntimeStore } from '../stores/runtime'
const store = useRuntimeStore()
const route = useRoute()
const router = useRouter()
const book = computed(() => store.books.filter(b => b.id == route.query.id)[0])
const chapid = ref(null)
watch(() => book.value, async () => {
    if (book.value) {
        bookChange()
    }
})

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
        console.log('call sub', event.data)
        if (event.data.name == 'prompt') {
            result = await new Promise(r => {
                promptOpen.value = true
                const unwatch = watch(() => promptOpen.value, () => {
                    unwatch()
                    r(promptValue.value)
                })
            })
        } else if (event.data.name == 'progress') {
            bookConfig.value = {
                ...bookConfig.value,
                chap: chapid.value,
                progress: event.data.params[0]
            }
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
    if (book.value) {
        bookChange()
    }
})
onUnmounted(() => {
    window.removeEventListener('message', msgCallback)
})
const iframe = ref(null)
const bookConfig = ref(null)
function iframeSend(msg) {
    iframe.value.contentWindow.postMessage(msg, '*')
}
watch(bookConfig, async () => {
    await api.call('setConfig', book.value.id, { ...bookConfig.value })
    iframeSend({ ...bookConfig.value, name: 'config' })
}, { deep: true })
async function bookChange() {
    bookConfig.value = await api.call('config', { book: book.value.id })
    chapid.value = route.query.chap || bookConfig.value.chap || book.value.toc[0].href
    if (bookConfig.value.progress) {
        setTimeout(() => {
            iframeSend({
                name: 'setProgress',
                progress: bookConfig.value.progress
            }, '*')
        }, 1500);
    }
}

</script>
<template>
    <div v-if="book">
        <div class="flex">
            <iframe v-if="chapid" ref="iframe" class="flex-1 h-screen border p-5" :src="store.resourceUrl(book.id, chapid)"
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
        <DropdownMenuRoot>
            <DropdownMenuTrigger
                class="fixed left-2 bottom-2 opacity-10 hover:opacity-80 rounded-full w-[35px] h-[35px] inline-flex items-center justify-center text-grass11 bg-white shadow-[0_2px_10px] shadow-blackA7 outline-none hover:bg-green3 focus:shadow-[0_0_0_2px] focus:shadow-black"
                aria-label="Customise options">
                <Icon icon="radix-icons:hamburger-menu" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent
                    class="min-w-[220px] outline-none bg-white rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
                    :side-offset="5">
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                            class="group w-full text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[state=open]:bg-green4 data-[state=open]:text-grass11 data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1 data-[highlighted]:data-[state=open]:bg-green9 data-[highlighted]:data-[state=open]:text-green1">
                            目录
                            <div
                                class="ml-auto pl-[20px] text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                                <Icon icon="radix-icons:chevron-right" />
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent
                                class="min-w-[220px] outline-none bg-white rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
                                :side-offset="2" :align-offset="-5">
                                <template v-for="item in book.toc.sort((a, b) => a.order - b.order)" :key="item.id">
                                    <DropdownMenuSub v-if="item.children && item.children.length">
                                        <DropdownMenuSubTrigger value="more toolsz"
                                            class="group w-full text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[state=open]:bg-green4 data-[state=open]:text-grass11 data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1 data-[highlighted]:data-[state=open]:bg-green9 data-[highlighted]:data-[state=open]:text-green1">
                                            {{ item.title }}
                                            <div
                                                class="ml-auto pl-[20px] text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                                                <Icon icon="radix-icons:chevron-right" />
                                            </div>
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                            <DropdownMenuSubContent
                                                class="min-w-[220px] outline-none bg-white rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
                                                :side-offset="2" :align-offset="-5">
                                                <DropdownMenuItem v-for="subitem in item.children"
                                                    @click="chapid = subitem.href"
                                                    class="group text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1">
                                                    {{ subitem.title }}
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                    </DropdownMenuSub>

                                    <DropdownMenuItem v-else @click="chapid = item.href"
                                        class="group text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1">
                                        {{ item.title }}
                                    </DropdownMenuItem>
                                </template>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                            class="group w-full text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[state=open]:bg-green4 data-[state=open]:text-grass11 data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1 data-[highlighted]:data-[state=open]:bg-green9 data-[highlighted]:data-[state=open]:text-green1">
                            字体
                            <div
                                class="ml-auto pl-[20px] text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                                <Icon icon="radix-icons:chevron-right" />
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent
                                class="min-w-[220px] outline-none bg-white rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
                                :side-offset="2" :align-offset="-5">
                                <DropdownMenuItem @click="bookConfig.fontsize = (bookConfig.fontsize || 3) + 1"
                                    class="group text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1">
                                    增大字体
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="bookConfig.fontsize = (bookConfig.fontsize || 3) - 1"
                                    class="text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1">
                                    缩小字体
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger
                            class="group w-full text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[state=open]:bg-green4 data-[state=open]:text-grass11 data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1 data-[highlighted]:data-[state=open]:bg-green9 data-[highlighted]:data-[state=open]:text-green1">
                            边界
                            <div
                                class="ml-auto pl-[20px] text-mauve11 group-data-[highlighted]:text-white group-data-[disabled]:text-mauve8">
                                <Icon icon="radix-icons:chevron-right" />
                            </div>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent
                                class="min-w-[220px] outline-none bg-white rounded-md p-[5px] shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] will-change-[opacity,transform] data-[side=top]:animate-slideDownAndFade data-[side=right]:animate-slideLeftAndFade data-[side=bottom]:animate-slideUpAndFade data-[side=left]:animate-slideRightAndFade"
                                :side-offset="2" :align-offset="-5">
                                <DropdownMenuItem @click="bookConfig.margin = (bookConfig.margin || 3) + 1"
                                    class="group text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1">
                                    增大边界
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="bookConfig.margin = (bookConfig.margin || 3) - 1"
                                    class="text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1">
                                    缩小边界
                                </DropdownMenuItem>
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuItem @click="router.push(`/`)"
                        class="group text-[13px] leading-none text-grass11 rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none data-[disabled]:text-mauve8 data-[disabled]:pointer-events-none data-[highlighted]:bg-green9 data-[highlighted]:text-green1">
                        返回
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenuRoot>
    </div>
</template>