/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'next' serves the v1 rebuild (src/next); anything else the current site. */
  readonly VITE_APP?: string;
}
