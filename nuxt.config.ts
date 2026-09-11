// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  icon: {
    fallbackToApi: false,
    serverBundle: {
      collections: ['lucide']
    },
    clientBundle: {
      scan: true,
      sizeLimitKb: 512
    }
  },

  runtimeConfig: {
    catalogDbPath: process.env.CATALOG_DB_PATH || '',
    mapiClientId: process.env.MAPI_CLIENT_ID || '',
    mapiClientSecret: process.env.MAPI_CLIENT_SECRET || '',
    papiKey: process.env.PAPI_KEY || '',
    pimEnv: process.env.PIM_ENV || 'test'
  },

  fonts: {
    providers: {
      google: false,
      googleicons: false,
      bunny: false,
      fontshare: false,
      fontsource: false
    }
  },

  devServer: {
    host: '127.0.0.1',
    port: 3000
  },

  vite: {
    server: {
      watch: {
        ignored: ['**/node_modules/**', '**/.git/**', '**/data/**', '**/prospect/**']
      }
    }
  },

  nitro: {
    esbuild: {
      options: {
        target: 'esnext'
      }
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
