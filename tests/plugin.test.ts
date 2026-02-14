import { createPinia, defineStore, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createApp, reactive, ref } from 'vue'
import { createPiniaSimplePersist } from '../src'
import { makeSimplePersistMapper } from '../src/mapper'

function initializeLocalStorage(
  KEY: string,
  state: Record<string, unknown>,
): void {
  localStorage.clear()
  localStorage.setItem(KEY, JSON.stringify(state))
}

function readLocalStorage(KEY: string): Record<string, unknown> {
  return JSON.parse(localStorage.getItem(KEY) ?? '{}')
}

describe('createPiniaSimplePersist', () => {
  let pinia: ReturnType<typeof createPinia>
  let mockStorage: Storage
  let storageData: Record<string, string>

  beforeEach(() => {
    // Create mock storage for custom storage tests
    storageData = {}
    mockStorage = {
      getItem: vi.fn((key: string) => storageData[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storageData[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete storageData[key]
      }),
      clear: vi.fn(() => {
        storageData = {}
      }),
      key: vi.fn((index: number) => Object.keys(storageData)[index] ?? null),
      length: 0,
    }

    // Mock localStorage
    let localStorageState: Record<string, string> = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageState[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageState[key] = value
        }),
        removeItem: vi.fn((key: string) => delete localStorageState[key]),
        clear: vi.fn(() => {
          localStorageState = {}
        }),
        key: vi.fn((index: number) => Object.keys(localStorageState)[index] ?? null),
        length: 0,
      },
      writable: true,
    })
    const app = createApp({})

    pinia = createPinia()
    app.use(pinia)
    setActivePinia(pinia)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  describe('basic functionality', () => {
    it('should not affect stores without persist option', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useNonPersistedStore = defineStore('non-persisted', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }) // No persist option

      const usePersistedStore = defineStore('persisted', () => {
        const value = ref(10)

        return {
          value,
          $serializeState: () => ({ value: value.value }),
          $restoreState: (data: any) => {
            value.value = data.value
          },
        }
      }, {
        persist: {},
      })

      const nonPersistedStore = useNonPersistedStore()
      const persistedStore = usePersistedStore()

      nonPersistedStore.count = 100
      persistedStore.value = 200

      await Promise.resolve()

      // Only the persisted store should have called storage
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-persisted',
        JSON.stringify({ value: 200 })
      )
      expect(mockStorage.setItem).not.toHaveBeenCalledWith(
        'pinia-non-persisted',
        expect.anything()
      )
    })

    it('should persist and restore state', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.count = 42
      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-test',
        JSON.stringify({ count: 42 }),
      )
    })

    it('should restore state from storage on initialization', () => {
      storageData['pinia-test'] = JSON.stringify({ count: 99 })

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(store.count).toBe(99)
      expect(mockStorage.getItem).toHaveBeenCalledWith('pinia-test')
    })

    it('should not persist if persist option is not set', () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      })

      const store = useTestStore()
      store.count = 42

      expect(mockStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('custom key', () => {
    it('should use custom key from store options', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {
          key: 'custom-key',
        },
      })

      const store = useTestStore()
      store.count = 42
      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'custom-key',
        JSON.stringify({ count: 42 }),
      )
    })

    it('should use global makeKey function', async () => {
      const makeKey = vi.fn((id: string) => `app-${id}`)
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        makeKey,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.count = 42

      expect(makeKey).toHaveBeenCalledWith('test')
      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'app-test',
        JSON.stringify({ count: 42 }),
      )
    })

    it('should prefer store key over global makeKey', async () => {
      const makeKey = vi.fn((id: string) => `app-${id}`)
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        makeKey,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {
          key: 'override-key',
        },
      })

      const store = useTestStore()
      store.count = 42
      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'override-key',
        JSON.stringify({ count: 42 }),
      )
    })
  })

  describe('custom serializer', () => {
    it('should use custom serializer from global options', async () => {
      const customSerializer = {
        serialize: vi.fn((data: any) => `custom-${JSON.stringify(data)}`),
        deserialize: vi.fn((str: string) => JSON.parse(str.replace('custom-', ''))),
      }

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        serializer: customSerializer,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.count = 42
      await Promise.resolve()

      expect(customSerializer.serialize).toHaveBeenCalledWith({ count: 42 })
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-test',
        'custom-{"count":42}',
      )
    })

    it('should use custom serializer from store options', async () => {
      const customSerializer = {
        serialize: vi.fn((data: any) => `store-${JSON.stringify(data)}`),
        deserialize: vi.fn((str: string) => JSON.parse(str.replace('store-', ''))),
      }

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {
          serializer: customSerializer,
        },
      })

      const store = useTestStore()
      store.count = 42

      await Promise.resolve()

      expect(customSerializer.serialize).toHaveBeenCalledWith({ count: 42 })
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-test',
        'store-{"count":42}',
      )
    })

    it('should deserialize with custom serializer on restore', () => {
      const customSerializer = {
        serialize: vi.fn((data: any) => `custom-${JSON.stringify(data)}`),
        deserialize: vi.fn((str: string) => JSON.parse(str.replace('custom-', ''))),
      }

      storageData['pinia-test'] = 'custom-{"count":99}'

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        serializer: customSerializer,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(customSerializer.deserialize).toHaveBeenCalledWith('custom-{"count":99}')
      expect(store.count).toBe(99)
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should cleanup debounce timer on store disposal with explicit verification', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        debounce: 1000,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      // Create a timeout
      store.count = 42

      // Wait for subscription to fire
      await vi.advanceTimersByTimeAsync(0)

      // Now dispose (should call cleanup which calls clearTimeout)
      store.$dispose()

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should debounce saves with global debounce option', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        debounce: 1000,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      store.count = 1
      store.count = 2
      store.count = 3

      await Promise.resolve()

      // Should not save immediately
      expect(mockStorage.setItem).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(mockStorage.setItem).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-test',
        JSON.stringify({ count: 3 }),
      )
    })

    it('should debounce saves with store debounce option', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {
          debounce: 500,
        },
      })

      const store = useTestStore()

      store.count = 1
      store.count = 2
      await Promise.resolve()

      expect(mockStorage.setItem).not.toHaveBeenCalled()

      vi.advanceTimersByTime(500)
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
    })

    it('should reset debounce timer on each change', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        debounce: 1000,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      store.count = 1
      await vi.advanceTimersByTimeAsync(500)

      store.count = 2
      await vi.advanceTimersByTimeAsync(500)

      // Should not have saved yet
      expect(mockStorage.setItem).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(500)

      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-test',
        JSON.stringify({ count: 2 }),
      )
    })

    it('should cleanup debounce timer on store disposal', () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        debounce: 1000,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      store.count = 42
      store.$dispose()

      vi.advanceTimersByTime(1000)

      // Should not save after disposal
      expect(mockStorage.setItem).not.toHaveBeenCalled()
    })
  })

  describe('lifecycle hooks', () => {
    it('should call beforeRestore hook', () => {
      const beforeRestore = vi.fn()
      storageData['pinia-test'] = JSON.stringify({ count: 99 })

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        beforeRestore,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(beforeRestore).toHaveBeenCalledTimes(1)
      expect(beforeRestore).toHaveBeenCalledWith(
        expect.objectContaining({
          store,
          options: expect.any(Object),
        }),
      )
    })

    it('should call afterRestore hook', () => {
      const afterRestore = vi.fn()
      storageData['pinia-test'] = JSON.stringify({ count: 99 })

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        afterRestore,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(afterRestore).toHaveBeenCalledTimes(1)
      expect(afterRestore).toHaveBeenCalledWith(
        expect.objectContaining({
          store,
          options: expect.any(Object),
        }),
      )
    })

    it('should call hooks from store options over global options', () => {
      const globalBeforeRestore = vi.fn()
      const globalAfterRestore = vi.fn()
      const storeBeforeRestore = vi.fn()
      const storeAfterRestore = vi.fn()

      storageData['pinia-test'] = JSON.stringify({ count: 99 })

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        beforeRestore: globalBeforeRestore,
        afterRestore: globalAfterRestore,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {
          beforeRestore: storeBeforeRestore,
          afterRestore: storeAfterRestore,
        },
      })

      const store = useTestStore()

      expect(globalBeforeRestore).not.toHaveBeenCalled()
      expect(globalAfterRestore).not.toHaveBeenCalled()
      expect(storeBeforeRestore).toHaveBeenCalledTimes(1)
      expect(storeAfterRestore).toHaveBeenCalledTimes(1)
    })

    it('should not call afterRestore if no stored data exists', () => {
      const beforeRestore = vi.fn()
      const afterRestore = vi.fn()

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        beforeRestore,
        afterRestore,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(beforeRestore).toHaveBeenCalledTimes(1)
      expect(afterRestore).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should throw if deserialize fails and no onError handler', () => {
      storageData['pinia-test'] = 'invalid-json'

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      expect(() => useTestStore()).toThrow()
    })

    it('should call onError handler on deserialization error', async () => {
      const onError = vi.fn()
      storageData['pinia-test'] = 'invalid-json'

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        onError,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      await Promise.resolve()
      expect(() => useTestStore()).not.toThrow()
      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
      )
    })

    it('should prefer store onError over global onError', () => {
      const globalOnError = vi.fn()
      const storeOnError = vi.fn()
      storageData['pinia-test'] = 'invalid-json'

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        onError: globalOnError,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {
          onError: storeOnError,
        },
      })

      expect(() => useTestStore()).not.toThrow()
      expect(globalOnError).not.toHaveBeenCalled()
      expect(storeOnError).toHaveBeenCalledTimes(1)
    })

    it('should not call afterRestore on deserialization error', () => {
      const afterRestore = vi.fn()
      const onError = vi.fn()
      storageData['pinia-test'] = 'invalid-json'

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        afterRestore,
        onError,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(onError).toHaveBeenCalledTimes(1)
      expect(afterRestore).not.toHaveBeenCalled()
    })

    it('should handle non-Error objects in catch block', async () => {
      const onError = vi.fn()
      const customSerializer = {
        serialize: JSON.stringify,
        deserialize: () => {
          throw 'string error'
        },
      }
      storageData['pinia-test'] = 'data'

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
        serializer: customSerializer,
        onError,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      useTestStore()
      await Promise.resolve()
      expect(onError).toHaveBeenCalledTimes(1)
    })
  })

  describe('store disposal', () => {
    it('should unsubscribe from store updates on disposal', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.count = 1

      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)

      store.$dispose()
      store.count = 2

      await Promise.resolve()

      // Should not save after disposal
      expect(mockStorage.setItem).toHaveBeenCalledTimes(1)
    })

    it('should call original $dispose method', () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      const originalDispose = store.$dispose
      const disposeSpy = vi.fn(originalDispose)
      store.$dispose = disposeSpy

      store.$dispose()

      expect(disposeSpy).toHaveBeenCalled()
    })
  })

  describe('storage options', () => {
    it('should use localStorage by default', async () => {
      const KEY = 'pinia-test'
      initializeLocalStorage(KEY, {})

      const plugin = createPiniaSimplePersist()
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.count = 42
      await Promise.resolve()

      expect(localStorage.getItem).toHaveBeenCalled()
      expect(localStorage.setItem).toHaveBeenCalled()

      const stored = readLocalStorage(KEY)
      expect(stored).toEqual({ count: 42 })
    })

    it('should use custom storage from global options', async () => {
      const customStorage = {
        ...mockStorage,
      }

      const plugin = createPiniaSimplePersist({
        storage: customStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.count = 42
      await Promise.resolve()

      expect(customStorage.setItem).toHaveBeenCalled()
    })

    it('should use custom storage from store options', async () => {
      const customStorageData: Record<string, string> = {}
      const customStorage = {
        getItem: vi.fn((key: string) => customStorageData[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          customStorageData[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete customStorageData[key]
        }),
        clear: vi.fn(() => {
          Object.keys(customStorageData).forEach(key => delete customStorageData[key])
        }),
        key: vi.fn((index: number) => Object.keys(customStorageData)[index] ?? null),
        length: 0,
      }

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {
          storage: customStorage,
        },
      })

      const store = useTestStore()
      store.count = 42
      await Promise.resolve()

      expect(customStorage.setItem).toHaveBeenCalled()
      expect(mockStorage.setItem).not.toHaveBeenCalled()
    })

    it('should restore from localStorage on initialization', () => {
      const KEY = 'pinia-test'
      initializeLocalStorage(KEY, { count: 99 })

      const plugin = createPiniaSimplePersist()
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(store.count).toBe(99)
    })
  })

  describe('assertion functions', () => {
    it('should throw if store does not have $restoreState', () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
        }
      }, {
        persist: {},
      })

      expect(() => useTestStore()).toThrow(
        'A store using pinia-simple-persist must have a $restoreState() method',
      )
    })

    it('should throw if store does not have $serializeState', () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)

        return {
          count,
          $restoreState: () => {
          },
        }
      }, {
        persist: {},
      })

      expect(() => useTestStore()).toThrow(
        'A store using pinia-simple-persist must have a $serializeState() method',
      )
    })
  })

  describe('multiple stores', () => {
    it('should handle multiple stores independently', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useStore1 = defineStore('store1', () => {
        const count = ref(0)
        return {
          count,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const useStore2 = defineStore('store2', () => {
        const value = ref('test')
        return {
          value,
          $serializeState: () => ({ value: value.value }),
          $restoreState: (data: any) => {
            value.value = data.value
          },
        }
      }, {
        persist: {},
      })

      const store1 = useStore1()
      const store2 = useStore2()

      store1.count = 100
      store2.value = 'hello'
      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-store1',
        JSON.stringify({ count: 100 }),
      )
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-store2',
        JSON.stringify({ value: 'hello' }),
      )
    })
  })

  describe('computed properties', () => {
    it('should not persist computed properties', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const count = ref(0)
        const doubled = computed(() => count.value * 2)

        return {
          count,
          doubled,
          $serializeState: () => ({ count: count.value }),
          $restoreState: (data: any) => {
            count.value = data.count
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.count = 5
      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-test',
        JSON.stringify({ count: 5 }),
      )
      // doubled should not be in the serialized state
    })
  })

  describe('reactive objects', () => {
    it('should persist reactive objects', async () => {
      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })
      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const user = reactive({ name: 'John', age: 30 })

        return {
          user,
          $serializeState: () => ({ user }),
          $restoreState: (data: any) => {
            Object.assign(user, data.user)
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()
      store.user.name = 'Jane'
      await Promise.resolve()

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'pinia-test',
        JSON.stringify({ user: { name: 'Jane', age: 30 } }),
      )
    })

    it('should restore reactive objects', () => {
      storageData['pinia-test'] = JSON.stringify({ user: { name: 'Jane', age: 25 } })

      const plugin = createPiniaSimplePersist({
        storage: mockStorage,
      })

      pinia.use(plugin)

      const useTestStore = defineStore('test', () => {
        const user = reactive({ name: 'John', age: 30 })

        return {
          user,
          $serializeState: () => ({ user }),
          $restoreState: (data: any) => {
            Object.assign(user, data.user)
          },
        }
      }, {
        persist: {},
      })

      const store = useTestStore()

      expect(store.user.name).toBe('Jane')
      expect(store.user.age).toBe(25)
    })
  })
})

describe('makeSimplePersistMapper', () => {
  beforeEach(() => {
    // Mock localStorage for mapper tests
    let localStorageState: Record<string, string> = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageState[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageState[key] = value
        }),
        removeItem: vi.fn((key: string) => delete localStorageState[key]),
        clear: vi.fn(() => {
          localStorageState = {}
        }),
        key: vi.fn((index: number) => Object.keys(localStorageState)[index] ?? null),
        length: 0,
      },
      writable: true,
    })
  })

  it('should serialize state with refs', () => {
    const count = ref(42)
    const name = ref('test')

    const mapper = makeSimplePersistMapper(
      { count, name },
      { count: 0, name: '' },
    )
    const serialized = mapper.$serializeState()

    expect(serialized).toEqual({ count: 42, name: 'test' })
  })

  it('should restore state to refs', () => {
    const count = ref(0)
    const name = ref('')

    const mapper = makeSimplePersistMapper(
      { count, name },
      { count: 0, name: '' },
    )
    mapper.$restoreState({ count: 99, name: 'restored' })

    expect(count.value).toBe(99)
    expect(name.value).toBe('restored')
  })

  it('should skip missing keys during restore', () => {
    const count = ref(0)
    const name = ref('original')

    const mapper = makeSimplePersistMapper(
      { count, name },
      { count: 0, name: 'original' },
    )
    mapper.$restoreState({ count: 99 } as any)

    expect(count.value).toBe(99)
    expect(name.value).toBe('original')
  })

  it('should reset state to defaults', () => {
    const count = ref(42)
    const name = ref('test')

    const mapper = makeSimplePersistMapper(
      { count, name },
      { count: 0, name: '' },
    )
    mapper.$reset()

    expect(count.value).toBe(0)
    expect(name.value).toBe('')
  })

  it('should handle reactive objects', () => {
    const user = reactive({ name: 'John', age: 30 })

    const mapper = makeSimplePersistMapper(
      { user },
      { user: { name: '', age: 0 } },
    )

    const serialized = mapper.$serializeState()
    expect(serialized).toEqual({ user: { name: 'John', age: 30 } })
  })

  it('should restore reactive objects', () => {
    const user = reactive({ name: 'John', age: 30 })

    const mapper = makeSimplePersistMapper(
      { user },
      { user: { name: '', age: 0 } },
    )

    mapper.$restoreState({ user: { name: 'Jane', age: 25 } })

    expect(user.name).toBe('Jane')
    expect(user.age).toBe(25)
  })

  it('should handle mixed refs and reactives', () => {
    const count = ref(42)
    const user = reactive({ name: 'John' })

    const mapper = makeSimplePersistMapper(
      { count, user },
      { count: 0, user: { name: '' } },
    )

    const serialized = mapper.$serializeState()
    expect(serialized).toEqual({ count: 42, user: { name: 'John' } })
  })

  it('should handle complex nested structures', () => {
    const data = ref({
      nested: {
        deep: {
          value: 'test',
        },
      },
    })

    const mapper = makeSimplePersistMapper(
      { data },
      { data: { nested: { deep: { value: '' } } } },
    )

    const serialized = mapper.$serializeState()
    expect(serialized).toEqual({
      data: {
        nested: {
          deep: {
            value: 'test',
          },
        },
      },
    })
  })

  it('should handle arrays', () => {
    const items = ref([1, 2, 3])

    const mapper = makeSimplePersistMapper(
      { items },
      { items: [] as number[] },
    )

    const serialized = mapper.$serializeState()
    expect(serialized).toEqual({ items: [1, 2, 3] })
  })

  it('should restore arrays', () => {
    const items = ref([1, 2, 3])

    const mapper = makeSimplePersistMapper(
      { items },
      { items: [] as number[] },
    )

    mapper.$restoreState({ items: [4, 5, 6] })

    expect(items.value).toEqual([4, 5, 6])
  })

  it('should reset reactive objects to defaults', () => {
    const user = reactive({ name: 'John', age: 30 })

    const mapper = makeSimplePersistMapper(
      { user },
      { user: { name: 'Default', age: 0 } }
    )

    // Change the values
    user.name = 'Jane'
    user.age = 25

    // Reset should restore defaults
    mapper.$reset()

    expect(user.name).toBe('Default')
    expect(user.age).toBe(0)
  })

  it('should handle plain values in restoreState', () => {
    const plainValue = { value: 42 } // Not a ref, not reactive, just a plain object with .value property

    const mapper = makeSimplePersistMapper(
      { plain: plainValue as any },
      { plain: { value: 0 } }
    )

    // This should hit the implicit else case (do nothing)
    mapper.$restoreState({ plain: { value: 100 } })

    // Since it's not a ref or reactive, it won't be updated
    expect(plainValue.value).toBe(42)
  })
})