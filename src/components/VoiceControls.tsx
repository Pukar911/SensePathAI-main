import { useEffect, useRef, useState } from "react"
import {
  AudioLines,
  Ear,
  Mic,
  MicOff,
  Settings2,
  Volume2,
  VolumeX,
} from "lucide-react"
import type { SpeechController } from "../hooks/useSpeech"

type RecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  abort: () => void
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>
  }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type RecognitionConstructor = new () => RecognitionInstance

function getRecognition(): RecognitionConstructor | null {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return (
    speechWindow.SpeechRecognition ||
    speechWindow.webkitSpeechRecognition ||
    null
  )
}

export function VoiceControls({
  voice,
  onDescribe,
  onWhereAmI,
  onStop,
  onOpenSettings,
}: {
  voice: SpeechController
  onDescribe: () => void
  onWhereAmI: () => void
  onStop: () => void
  onOpenSettings: () => void
}) {
  const recognitionRef = useRef<RecognitionInstance | null>(null)
  const [listening, setListening] = useState(false)
  const [commandMessage, setCommandMessage] = useState("")
  const recognitionSupported = Boolean(getRecognition())

  useEffect(
    () => () => {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    },
    [],
  )

  function listenForCommand() {
    const Recognition = getRecognition()
    if (!Recognition || listening) return

    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = "en-US"
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const command = event.results[0]?.[0]?.transcript.toLowerCase() || ""
      if (command.includes("describe")) {
        onDescribe()
        setCommandMessage("Describing surroundings.")
      } else if (command.includes("stop assistance")) {
        setCommandMessage("Stopping assistance.")
        onStop()
      } else if (command.includes("where am i")) {
        onWhereAmI()
        setCommandMessage("Reading current location.")
      } else if (command.includes("mute")) {
        voice.mute()
        setCommandMessage("Voice muted.")
      } else {
        setCommandMessage(
          "Command not recognized. Try describe surroundings, where am I, mute voice, or stop assistance.",
        )
      }
    }
    recognition.onerror = () =>
      setCommandMessage(
        "Voice command could not be heard. Use the buttons instead.",
      )
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }
    setCommandMessage("Listening for one command…")
    setListening(true)
    recognition.start()
  }

  return (
    <section
      className="voice-controls"
      aria-labelledby="voice-controls-heading"
    >
      <div className="voice-controls__heading">
        <div>
          <p className="section-kicker">Spoken assistance</p>
          <h2 id="voice-controls-heading">Voice</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onOpenSettings}
          aria-label="Open voice settings"
        >
          <Settings2 size={20} />
        </button>
      </div>
      <div className="voice-control-grid">
        <button
          className={`voice-action ${
            voice.preferences.enabled ? "voice-action--active" : ""
          }`}
          type="button"
          disabled={!voice.supported}
          onClick={voice.preferences.enabled ? voice.mute : voice.enable}
          aria-pressed={voice.preferences.enabled}
        >
          {voice.preferences.enabled ? (
            <VolumeX size={21} />
          ) : (
            <Volume2 size={21} />
          )}
          <span>
            <strong>
              {voice.preferences.enabled ? "Mute Voice" : "Enable Voice"}
            </strong>
            <small>{voice.speaking ? "Speaking now" : "Speech output"}</small>
          </span>
        </button>
        <button
          className="voice-action"
          type="button"
          disabled={!voice.supported}
          onClick={onDescribe}
        >
          <Ear size={21} />
          <span>
            <strong>Describe</strong>
            <small>Current camera view</small>
          </span>
        </button>
      </div>
      <button
        className="command-button"
        type="button"
        disabled={!recognitionSupported || listening}
        onClick={listenForCommand}
      >
        {recognitionSupported ? (
          listening ? (
            <AudioLines size={19} />
          ) : (
            <Mic size={19} />
          )
        ) : (
          <MicOff size={19} />
        )}
        {recognitionSupported
          ? listening
            ? "Listening…"
            : "Use one voice command"
          : "Voice commands unavailable in this browser"}
      </button>
      {commandMessage && (
        <p className="command-status" role="status">
          {commandMessage}
        </p>
      )}
    </section>
  )
}
