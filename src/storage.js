function hasCloudStorage() {
  const tg = window.Telegram?.WebApp
  return !!(tg?.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9'))
}

export const storage = {
  setItem(key, value) {
    return new Promise((resolve) => {
      if (hasCloudStorage()) {
        window.Telegram.WebApp.CloudStorage.setItem(key, value, () => resolve())
      } else {
        localStorage.setItem(key, value)
        resolve()
      }
    })
  },
  getItem(key) {
    return new Promise((resolve) => {
      if (hasCloudStorage()) {
        window.Telegram.WebApp.CloudStorage.getItem(key, (err, value) => resolve(value || null))
      } else {
        resolve(localStorage.getItem(key))
      }
    })
  },
  getKeys() {
    return new Promise((resolve) => {
      if (hasCloudStorage()) {
        window.Telegram.WebApp.CloudStorage.getKeys((err, keys) => resolve(keys || []))
      } else {
        resolve(Object.keys(localStorage))
      }
    })
  },
  removeItem(key) {
    return new Promise((resolve) => {
      if (hasCloudStorage()) {
        window.Telegram.WebApp.CloudStorage.removeItem(key, () => resolve())
      } else {
        localStorage.removeItem(key)
        resolve()
      }
    })
  },
}