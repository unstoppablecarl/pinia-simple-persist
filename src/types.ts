import type { PersistOptions } from './index'

/**
 * Synchronous storage based on Web Storage API.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Storage
 */
export interface StorageLike {
  /**
   * Get a key's value if it exists.
   */
  getItem: (key: string) => string | null

  /**
   * Set a key with a value, or update it if it exists.
   */
  setItem: (key: string, value: string) => void
}

export interface Serializer<T> {
  /**
   * Serialize state into string before storing.
   * @default JSON.stringify
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
   */
  serialize: (data: T) => string

  /**
   * Deserializes string into state before hydrating.
   * @default JSON.parse
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
   */
  deserialize: (data: string) => T
}

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: PersistOptions<any> | boolean
  }

  export interface PiniaCustomProperties {
    $persist: () => void
    $restoreState?: (data: any) => void
    $serializeState?: () => any
  }
}