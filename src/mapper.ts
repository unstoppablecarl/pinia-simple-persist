import type { Ref } from 'vue'
import { toRaw, isRef, isReactive } from 'vue'

type RefOrReactive<T> = Ref<T> | T

export function makeSimplePersistMapper<T extends Record<string, any>>(
  state: { [K in keyof T]: RefOrReactive<T[K]> },
  defaults: T,
) {
  return {
    $serializeState(): T {
      const out = {} as T
      for (const key in state) {
        const item = state[key]
        let value: any

        if (isRef(item)) {
          value = item.value
        } else {
          value = item
        }

        // Strip reactivity for serialization
        out[key] = isReactive(value) ? toRaw(value) : value
      }
      return out
    },

    $restoreState(data: T) {
      for (const key in state) {
        if (!(key in data)) continue

        const item = state[key]

        if (isRef(item)) {
          item.value = data[key]
        } else if (isReactive(item)) {
          // Update reactive object properties in place
          Object.assign(item, data[key])
        }
      }
    },

    $reset() {
      for (const key in state) {
        const item = state[key]

        if (isRef(item)) {
          item.value = defaults[key]
        } else if (isReactive(item)) {
          Object.assign(item, defaults[key])
        }
      }
    },
  }
}