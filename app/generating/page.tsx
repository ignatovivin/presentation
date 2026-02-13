'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const GENERATION_STEPS = [
  'Анализирую ваш контент...',
  'Создаю структуру презентации...',
  'Генерирую слайды...',
  'Оптимизирую контент...',
  'Завершаю подготовку...',
]

export default function GeneratingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const timersRef = useRef<{ progress?: ReturnType<typeof setInterval>; step?: ReturnType<typeof setInterval>; nav?: ReturnType<typeof setTimeout> }>({})

  useEffect(() => {
    timersRef.current.progress = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 2))
    }, 100)

    timersRef.current.step = setInterval(() => {
      setCurrentStep((prev) => (prev >= GENERATION_STEPS.length - 1 ? prev : prev + 1))
    }, 1500)

    timersRef.current.nav = setTimeout(() => router.push('/editor'), 7500)

    return () => {
      if (timersRef.current.progress) clearInterval(timersRef.current.progress)
      if (timersRef.current.step) clearInterval(timersRef.current.step)
      if (timersRef.current.nav) clearTimeout(timersRef.current.nav)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-[rgb(52,137,243)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 bg-[#fafafa] rounded-full" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">
              Создаю вашу презентацию
            </h2>
            <p className="text-base text-[rgb(134,133,133)]">
              {GENERATION_STEPS[currentStep]}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[rgb(52,137,243)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-[rgb(134,133,133)]">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-center gap-2">
          {GENERATION_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index <= currentStep
                  ? 'bg-[rgb(52,137,243)] w-8'
                  : 'bg-gray-300 w-1.5'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
