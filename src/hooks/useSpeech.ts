import { useCallback, useEffect, useState } from "react"

export type SpeechRate = "slow" | "normal" | "fast"
export type SpeechPriority = "routine" | "navigation"

export type VoicePreferences = {
  enabled: boolean
  rate: SpeechRate
  frequency: 3 | 5 | 10
  autoAnnounce: boolean
}

const STORAGE_KEY = "sensepath-voice-preferences"
const RATE_VALUES: Record<SpeechRate, number> = {
  slow: 0.78,
  normal: 1,
  fast: 1.22,
}

const DEFAULT_PREFERENCES: VoicePreferences = {
  enabled: false,
  rate: "normal",
  frequency: 5,
  autoAnnounce: true,
}

function loadPreferences(): VoicePreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    return {
      enabled: saved.enabled === true,
      rate: ["slow", "normal", "fast"].includes(saved.rate)
        ? saved.rate
        : DEFAULT_PREFERENCES.rate,
      frequency: [3, 5, 10].includes(saved.frequency)
        ? saved.frequency
        : DEFAULT_PREFERENCES.frequency,
      autoAnnounce:
        typeof saved.autoAnnounce === "boolean"
          ? saved.autoAnnounce
          : DEFAULT_PREFERENCES.autoAnnounce,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window
  const [preferences, setPreferences] =
    useState<VoicePreferences>(loadPreferences)
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences])

  const speak = useCallback(
    (
      text: string,
      priority: SpeechPriority = "routine",
      force = false,
    ): boolean => {
      if (!supported || (!preferences.enabled && !force) || !text.trim())
        return false

      const synth = window.speechSynthesis
      if (priority === "routine" && synth.speaking) return false

      // SensePath intentionally keeps at most one utterance queued.
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = RATE_VALUES[preferences.rate]
      utterance.pitch = 1
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      synth.speak(utterance)
      return true
    },
    [preferences.enabled, preferences.rate, supported],
  )

  const enable = useCallback(() => {
    setPreferences((current) => ({ ...current, enabled: true }))
    if (supported) {
      window.speechSynthesis.cancel()
      const confirmation = new SpeechSynthesisUtterance(
        "Voice assistance enabled.",
      )
      confirmation.rate = RATE_VALUES[preferences.rate]
      window.speechSynthesis.speak(confirmation)
    }
  }, [preferences.rate, supported])

  const mute = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
    setPreferences((current) => ({ ...current, enabled: false }))
  }, [supported])

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const updatePreferences = useCallback(
    (updates: Partial<VoicePreferences>) => {
      if (updates.enabled === false && supported)
        window.speechSynthesis.cancel()
      setPreferences((current) => ({ ...current, ...updates }))
    },
    [supported],
  )

  useEffect(
    () => () => {
      if (supported) window.speechSynthesis.cancel()
    },
    [supported],
  )

  return {
    supported,
    speaking,
    preferences,
    speak,
    enable,
    mute,
    cancel,
    updatePreferences,
  }
}

export type SpeechController = ReturnType<typeof useSpeech>
