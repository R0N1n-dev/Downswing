<script setup>
import { Minus, Plus } from 'lucide-vue-next'

const props = defineProps({ modelValue: Number, min: { type: Number, default: 0 }, max: { type: Number, default: 99 }, step: { type: Number, default: 1 }, format: { type: Function, default: (v) => String(v) } })
const emit = defineEmits(['update:modelValue'])
const set = (v) => emit('update:modelValue', Math.min(props.max, Math.max(props.min, v)))
</script>

<template>
  <div class="stepper">
    <button type="button" class="round sm" aria-label="Decrease" :disabled="modelValue <= min" @click="set(modelValue - step)"><Minus :size="16" /></button>
    <span class="num">{{ format(modelValue) }}</span>
    <button type="button" class="round sm" aria-label="Increase" :disabled="modelValue >= max" @click="set(modelValue + step)"><Plus :size="16" /></button>
  </div>
</template>
