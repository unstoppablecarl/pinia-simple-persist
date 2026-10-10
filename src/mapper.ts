import type { Ref } from 'vue'
import { toRaw, isRef, isReactive } from 'vue'

type RefOrReactive<T> = Ref<T> | T

// Deep-copies arrays and plain objects so state never shares references with defaults.
// Other values (Dates, Maps, class instances) are kept as-is.
function cloneDefault<T>(value: T): T {
  const raw = toRaw(value)
  if (Array.isArray(raw)) return raw.map(cloneDefault) as T
  if (raw && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype) {
    const out: Record<string, unknown> = {}
    for (const key in raw) out[key] = cloneDefault((raw as Record<string, unknown>)[key])
    return out as T
  }
  return raw
}

function getStateDefaults<T extends Record<string, any>>(
  state: { [K in keyof T]: RefOrReactive<T[K]> },
  overrides: Partial<NoInfer<T>> = {},
): T {
  const out = {} as T
  for (const key in state) {
    const item = state[key]
    const value = key in overrides ? overrides[key] : isRef(item) ? item.value : item
    out[key] = cloneDefault(value as T[typeof key])
  }
  return out
}

export function makeSimplePersistMapper<T extends Record<string, any>>(
  state: { [K in keyof T]: RefOrReactive<T[K]> },
  overrides: Partial<NoInfer<T>> = {},
) {
  return makeSimplePersistMapperRaw(state, getStateDefaults(state, overrides))
}

export function makeSimplePersistMapperRaw<T extends Record<string, any>>(
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
          Object.assign(item, data[key])
        }
      }
    },

    $reset() {
      for (const key in state) {
        const item = state[key]

        if (isRef(item)) {
          item.value = cloneDefault(defaults[key])
        } else if (isReactive(item)) {
          Object.assign(item, cloneDefault(defaults[key]))
        }
      }
    },
  }
}
