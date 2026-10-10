# Pinia Simple Persist

A Simple [Pinia](https://pinia.vuejs.org/) persistence plugin without using $patch

## Purpose

Most pinia state persistence plugins use `store.$patch()`.
This has many limitations and can create [hard to solve bugs](https://github.com/vuejs/pinia/issues?q=store.%24patch).
Pinia Simple Persist gives complete control over how state data is handled without using `store.$patch()`.

## Installation

`$ npm i pinia-simple-persist`

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
import { reactive, ref } from 'vue'
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

  // $reset() defaults are snapshotted from the current state values (deep copied)
  // create the mapper before any state is modified
  const { $reset, $serializeState, $restoreState } = makeSimplePersistMapper<SerializedData>(state)

  // optionally pass default values that override the snapshotted values
  // const { $reset, $serializeState, $restoreState } = makeSimplePersistMapper<SerializedData>(state, { count: 10 })

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

### Customizing
Wrap any mapper method to add your own logic, for example migrating previously stored data.

```ts
const mapper = makeSimplePersistMapper<SerializedData>(state)

function $restoreState(data: SerializedData & { title?: string }) {
  // `name` was previously stored as `title`
  if (data.title !== undefined) data.name = data.title
  mapper.$restoreState(data)
}

return {
  $reset: mapper.$reset,
  $serializeState: mapper.$serializeState,
  $restoreState,
  name,
  count,
  obj,
}
```

### Raw Mapper
`makeSimplePersistMapperRaw` skips the state snapshot and uses only the defaults you give it.
All keys are required.

```ts
const mapper = makeSimplePersistMapperRaw<SerializedData>(state, {
  name: '',
  count: 0,
  obj: { foo: 'bar' },
})
```

### Manual
This is the manual equivalent to the mappers above.

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
