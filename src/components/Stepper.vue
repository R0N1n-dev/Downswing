<script setup>
import { HugeiconsIcon } from '@hugeicons/vue'
import { MinusIcon, PlusIcon } from '@hugeicons/core-free-icons'

const props = defineProps({ modelValue: Number, min: { type: Number, default: 0 }, max: { type: Number, default: 99 }, step: { type: Number, default: 1 }, format: { type: Function, default: (v) => String(v) } })
const emit = defineEmits(['update:modelValue'])
const set = (v) => emit('update:modelValue', Math.min(props.max, Math.max(props.min, v)))
</script>

<template>
  <div class="stepper">
    <button type="button" class="round sm" aria-label="Decrease" :disabled="modelValue <= min" @click="set(modelValue - step)"><HugeiconsIcon :icon="MinusIcon" :size="16" :stroke-width="2.4" /></button>
    <span class="num">{{ format(modelValue) }}</span>
    <button type="button" class="round sm" aria-label="Increase" :disabled="modelValue >= max" @click="set(modelValue + step)"><HugeiconsIcon :icon="PlusIcon" :size="16" :stroke-width="2.4" /></button>
  </div>
</template>
