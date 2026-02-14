import type { PiniaPluginContext } from 'pinia'
import 'pinia'
import type { Serializer, StorageLike } from './types'

export type BaseSimplePersistOptions<Serialized> = {
  storage?: StorageLike
  serializer?: Serializer<Serialized>,
  debounce?: number
  beforeRestore?: (context: PiniaPluginContext) => void
  afterRestore?: (context: PiniaPluginContext) => void,
  onRestoreError?: (err: Error) => void,
}

export type GlobalSimplePersistOptions = BaseSimplePersistOptions<any> & {
  makeKey?: (storeId: string) => string,
}

export type SimplePersistOptions<Serialized> = BaseSimplePersistOptions<Serialized> & {
  key?: string,
}

export function createPiniaSimplePersist(globalOptions: GlobalSimplePersistOptions = {}) {
  const makeKey = globalOptions.makeKey ?? ((id: string) => `pinia-${id}`)

  return (context: PiniaPluginContext) => {
    const { store, options } = context

    ensureStoreHasRestoreState(store)
    ensureStoreHasSerializeState(store)

    const persist = options.persist as SimplePersistOptions<any> | undefined
    if (!persist) return

    const {
      key = makeKey(store.$id),
      storage = localStorage,
      serializer = {
        serialize: JSON.stringify,
        deserialize: JSON.parse,
      },
      debounce = 0,
      beforeRestore,
      afterRestore,
      onRestoreError,
    } = { ...globalOptions, ...persist }

    const restoreState = () => {
      beforeRestore?.(context)

      const stored = storage.getItem(key)
      if (!stored) return

      try {
        const data = serializer.deserialize(stored)
        store.$restoreState(data)
        afterRestore?.(context)
      } catch (error) {
        if (onRestoreError) {
          onRestoreError(error instanceof Error ? error : new Error(String(error)))
        } else {
          throw error
        }
      }
    }

    const saveState = () => {
      const state = store.$serializeState()
      const serialized = serializer.serialize(state)
      storage.setItem(key, serialized)
    }

    let finalSave = saveState
    let cleanupDebounce: (() => void) | undefined

    if (debounce) {
      const { debouncedFn, cleanup } = makeDebounce(saveState, debounce)
      finalSave = debouncedFn
      cleanupDebounce = cleanup
    }

    // Watch for changes and persist
    const unsubscribe = store.$subscribe(() => {
      finalSave()
    }, { detached: true })

    // Cleanup on store disposal
    const originalDispose = store.$dispose
    store.$dispose = function() {
      unsubscribe()
      cleanupDebounce?.()
      originalDispose.call(this)
    }

    // Restore state on initialization
    restoreState()
  }
}

const makeDebounce = <T extends () => void>(
  callback: T,
  waitFor: number,
) => {
  let timeout: ReturnType<typeof setTimeout> | undefined

  const debouncedFn = (): void => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      callback()
    }, waitFor)
  }

  const cleanup = (): void => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = undefined
    }
  }

  return { debouncedFn, cleanup }
}

function ensureStoreHasRestoreState<T>(store: T): asserts store is T & { $restoreState: (data: any) => void } {
  if (typeof (store as any).$restoreState !== 'function') {
    throw new Error('A store using pinia-simple-persist must have a $restoreState() method')
  }
}

function ensureStoreHasSerializeState<T>(store: T): asserts store is T & { $serializeState: () => any } {
  if (typeof (store as any).$serializeState !== 'function') {
    throw new Error('A store using pinia-simple-persist must have a $serializeState() method')
  }
}
