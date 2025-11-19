/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_TOKEN: string
  readonly VITE_SENTINEL_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
