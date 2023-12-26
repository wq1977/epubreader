<script setup>
import TreeNode from './Tree.vue'
defineProps(['node'])
defineEmits(['node'])
</script>
<template>
    <div>
        <div class="cursor-pointer" @click="$emit('node', node)"> {{ node.title }} </div>
        <template v-if="node.children">
            <TreeNode v-for="child in node.children" @node="$emit('node', child)" :key="child.id" :node="child" />
        </template>
    </div>
</template>