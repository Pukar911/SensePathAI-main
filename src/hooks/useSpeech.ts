import { useCallback, useEffect, useRef, useState } from "react"

export type SpeechRate = "slow" | "normal" | "fast"
export type SpeechPriority = "routine" | "navigation"

export type VoicePreferences = {
  enabled: boolean
  rate: SpeechRate
  frequency: 3 | 5 | 10
  autoAnnounce: boolean
  voiceCommandsEnabled: boolean // Added preference for listening
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
  voiceCommandsEnabled: true, // Active by default so users can navigate hands-free
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
      voiceCommandsEnabled:
        typeof saved.voiceCommandsEnabled === "boolean"
          ? saved.voiceCommandsEnabled
          : DEFAULT_PREFERENCES.voiceCommandsEnabled,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

// Helper to find and click UI elements by visible text or aria-label
function clickElementByText(targetName: string): boolean {
  const clickables = document.querySelectorAll<HTMLElement>(
    'button, a, input[type="button"], input[type="submit"], [role="button"]',
  )

  for (const el of clickables) {
    const text = (
      el.innerText ||
      el.getAttribute("aria-label") ||
      ""
    )
      .trim()
      .toLowerCase()

    if (text === targetName || text.includes(targetName)) {
      el.focus()
      el.click()
      return true
    }
  }
  return false
}

export function useSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window
  const recognitionSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  const [preferences, setPreferences] =
    useState<VoicePreferences>(loadPreferences)
  const [speaking, setSpeaking] = useState(false)
  const [listening, setListening] = useState(false)
  const [lastCommand, setLastCommand] = useState("")

  // Track speaking state in a ref so recognition doesn't trigger on the app's own voice
  const speakingRef = useRef(false)
  useEffect(() => {
    speakingRef.current = speaking
  }, [speaking])

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

  // --- Voice Navigation (Speech Recognition) ---
  useEffect(() => {
    if (!recognitionSupported || !preferences.voiceCommandsEnabled) {
      setListening(false)
      return
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => setListening(true)
    recognition.onend = () => {
      setListening(false)
      // Auto-restart listening if it times out while still enabled
      if (preferences.voiceCommandsEnabled) {
        try {
          recognition.start()
        } catch {
          // Ignore if already started
        }
      }
    }

    recognition.onresult = (event: any) => {
      // Ignore audio while SensePath is speaking out loud
      if (speakingRef.current) return

      const current = event.resultIndex
      const transcript = event.results[current][0].transcript
        .trim()
        .toLowerCase()

      setLastCommand(transcript)

      // 1. Direct "Click <element>" command
      if (transcript.startsWith("click ")) {
        const target = transcript.replace("click ", "").trim()
        const clicked = clickElementByText(target)
        if (clicked) speak(`Clicked ${target}`, "navigation")
        return
      }

      // 2. SensePath UI specific shortcuts
      if (
        transcript.includes("start assistance") ||
        transcript.includes("get started")
      ) {
        if (clickElementByText("start assistance")) {
          speak("Starting assistance", "navigation")
        }
      } else if (transcript.includes("how it works")) {
        if (clickElementByText("how it works")) {
          speak("Opening how it works", "navigation")
        }
      } else if (transcript.includes("increase text") || transcript.includes("larger text")) {
        clickElementByText("aa +")
      }
    }

    try {
      recognition.start()
    } catch (err) {
      console.warn("Speech recognition start error:", err)
    }

    return () => {
      recognition.onend = null // Prevent auto-restart on unmount
      recognition.stop()
      setListening(false)
    }
  }, [recognitionSupported, preferences.voiceCommandsEnabled, speak])

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
    recognitionSupported,
    speaking,
    listening,
    lastCommand,
    preferences,
    speak,
    enable,
    mute,
    cancel,
    updatePreferences,
  }
}

export type SpeechController = ReturnType<typeof useSpeech>