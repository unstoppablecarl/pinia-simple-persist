# Pinia Simple Persist

A Simple [Pinia](https://pinia.vuejs.org/) persistence plugin without using $patch

## Purpose

Most pinia state persistence plugins use `store.$patch()`. 
This has many limitations and can create hard to solve bugs.
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

## Example usage

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
