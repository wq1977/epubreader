<script setup>
import TreeNode from './Tree.vue'
import { ref } from 'vue'
defineProps(['node'])
defineEmits(['node'])
const folder = ref(true)
</script>
<template>
    <div>
        <div class="cursor-pointer select-none whitespace-nowrap"
            @click="node.children ? folder = !folder : $emit('node', node)"> {{
                node.title }} </div>
        <template v-if="node.children && !folder">
            <TreeNode v-for="child in node.children" @node="$emit('node', child)" :key="child.id" :node="child" />
        </template>
    </div>
</template>