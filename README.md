# Pinia Simple Persist

A Simple [Pinia](https://pinia.vuejs.org/) persistence plugin without using $patch

## Purpose

Most pinia state persistence plugins use `store.$patch()`. 
This has many limitations and can create [hard to solve bugs](https://github.com/vuejs/pinia/issues?q=store.%24patch).
Pinia Simple Persist gives complete control over how state data is handled without using `store.$patch()`.

## Installation

`$ npm i pinia-scope`

Attach pinia scope to the pinia instance in your `main.js` file.

```js
// main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { createPiniaSimplePersist } from 'pinia-simple-persist'

const app = createApp(App)
const pinia = createPinia()

pinia.use(createPiniaSimplePersist())

app.use(pinia)
app.mount('#app')
```

## Example Usage

### Using The Mapper
```ts
import { defineStore } from 'pinia'
import { reactive, ref, toRaw } from 'vue'
import { makeSimplePersistMapper } from 'pinia-simple-persist'

type SerializedData = {
  name: string,
  count: number,
  obj: {
    foo: string,
  }
}

export const useMyStore = defineStore('my', () => {
  const name = ref('')
  const count = ref(0)
  const obj = reactive({
    foo: 'bar',
  })

  const state = {
    name,
    count,
    obj,
  }

  const defaults: SerializedData = {
    name: name.value,
    count: count.value,
    obj: { ...toRaw(obj) },
  }
  
  const mapper = makeSimplePersistMapper<SerializedData>(
    state,
    defaults,
  )

  function $reset() {
    // uses defaults to reset all state
    mapper.$reset()
  }

  function $serializeState(): SerializedData {
    return {
      // unwraps reactive values for serialization
      ...mapper.$serializeState(),
    }
  }

  function $restoreState(data: SerializedData) {
    // set all states from storage
    mapper.$restoreState(data)
  }

  return {
    $reset,
    $serializeState,
    $restoreState,
    name,
    count,
    obj,
  }
}, {
  persist: true,
})
```

### Manual
This is the manual equivalent to the mapper above.

```ts
export const useMyStore = defineStore('my', () => {
  const name = ref('')
  const count = ref(0)
  const obj = reactive({
    foo: 'bar',
  })

  function $reset() {
    name.value = ''
    count.value = 0
    Object.assign(obj, {
      foo: 'bar'
    })
  }

  function $serializeState(): SerializedData {
    return {
      name: name.value,
      count: count.value,
      obj: toRaw(obj),
    }
  }

  function $restoreState(data: SerializedData) {
    name.value = data.name
    count.value = data.count
    Object.assign(obj, data.obj)
  }

  return {
    $reset,
    $serializeState,
    $restoreState,
    name,
    count,
    obj,
  }
}, {
  persist: true,
})
```

### Options

```ts
export type BaseSimplePersistOptions<Serialized> = {
  // window.localStorage by default
  storage?: StorageLike
  //defaults to {
  //  serialize: JSON.stringify,
  //  deserialize: JSON.parse,
  // }
  serializer?: Serializer<Serialized>,
  // defaults to 0 (0 disables debounce completely)
  debounce?: number

  beforeRestore?: (context: PiniaPluginContext) => void
  afterRestore?: (context: PiniaPluginContext) => void,
  // optionally intercept and handle a restore error
  onRestoreError?: (err: Error) => void,
}

export type GlobalSimplePersistOptions = BaseSimplePersistOptions<any> & {
  // key used for storage of each store
  // defaults to (id: string) => `pinia-${id}`
  makeKey?: (storeId: string) => string,
}

// global options are used when creating the plugin
pinia.use(createPiniaSimplePersist({
  // global options
} as GlobalSimplePersistOptions))

export type SimplePersistOptions<Serialized> = BaseSimplePersistOptions<Serialized> & {
  // the key for this store uses globla makeKey function by default
  key?: string,
}

// options for each store

export const useMyStore = defineStore('my', () => {
  // ...
}, {
  persist: {
    // store options
    // override global options
  } as SimplePersistOptions,
})
```

## Building

`$ pnpm install`
`$ pnpm run build`

## Testing

`$ pnpm run test`
`$ pnpm run test:mutation`

## Releases Automation

- update `package.json` file version (example: `1.0.99`)
- manually create a github release with a tag matching the `package.json` version prefixed with `v` (example: `v1.0.99`)
- npm should be updated automatically
