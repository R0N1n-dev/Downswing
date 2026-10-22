<script setup>
defineProps({ modelValue: Boolean, label: String })
defineEmits(['update:modelValue'])
</script>

<template>
  <button type="button" class="switch" role="switch" :aria-checked="modelValue" :aria-label="label"
    :class="{ on: modelValue }" @click="$emit('update:modelValue', !modelValue)">
    <span />
  </button>
</template>
