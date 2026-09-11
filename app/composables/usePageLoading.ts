export function usePageLoading() {
  const loading = useState('page-loading', () => false)
  const hooksRegistered = useState('page-loading-hooks', () => false)
  const nuxtApp = useNuxtApp()

  if (import.meta.client && !hooksRegistered.value) {
    hooksRegistered.value = true
    let timeout: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      loading.value = false
      if (timeout) {
        clearTimeout(timeout)
        timeout = undefined
      }
    }
    const start = () => {
      loading.value = true
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(stop, 8000)
    }
    nuxtApp.hook('page:start', start)
    nuxtApp.hook('page:finish', stop)
    nuxtApp.hook('vue:error', stop)
    nuxtApp.hook('app:error', stop)
  }

  return { loading }
}
