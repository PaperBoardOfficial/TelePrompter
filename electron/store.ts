import Store from "electron-store"
import { app } from 'electron'

interface StoreSchema {
  apiKey?: string;
  transparency?: number;
}

const store = new Store<StoreSchema>({
  defaults: {
    transparency: 80
  },
  clearInvalidConfig: true
}) as Store<StoreSchema> & {
  store: StoreSchema
  get: <K extends keyof StoreSchema>(key: K) => StoreSchema[K]
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => void
}

export { store }
