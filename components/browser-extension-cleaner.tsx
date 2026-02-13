'use client'

import { useEffect } from 'react'

export function BrowserExtensionCleaner() {
  useEffect(() => {
    // Функция для удаления элементов расширений
    const removeExtensionElements = () => {
      const selectors = [
        '[id^="ext-"]',
        '[class^="ext-"]',
        '[id*="megabonus"]',
        '[class*="megabonus"]',
        '[id="ext-megabonus-main-content"]',
        '[class="ext-megabonus-top-line"]',
      ]

      selectors.forEach((selector) => {
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach((el) => {
            if (el && el.parentNode) {
              el.remove()
            }
          })
        } catch (e) {
          // Игнорируем ошибки
        }
      })
    }

    // Удаляем сразу при монтировании компонента
    removeExtensionElements()

    // Используем MutationObserver для отслеживания новых элементов
    const observer = new MutationObserver(() => {
      removeExtensionElements()
    })

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
      })
    }

    // Периодическая проверка реже, чтобы не нагружать главный поток
    const interval = setInterval(removeExtensionElements, 2000)

    // Очистка при размонтировании
    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [])

  return null
}
