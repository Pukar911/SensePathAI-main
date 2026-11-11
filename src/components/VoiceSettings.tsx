import { Play, Volume2, X } from "lucide-react"
import type { SpeechController, SpeechRate } from "../hooks/useSpeech"

export function VoiceSettings({
  voice,
  onClose,
}: {
  voice: SpeechController
  onClose: () => void
}) {
  const { preferences } = voice

  return (
    <section
      className="settings-panel"
      aria-labelledby="voice-settings-heading"
    >
      <div className="settings-header">
        <div>
          <p className="section-kicker">Preferences</p>
          <h2 id="voice-settings-heading">Voice Settings</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close voice settings"
        >
          <X size={20} />
        </button>
      </div>

      {!voice.supported && (
        <p className="inline-alert" role="status">
          Speech synthesis is not available in this browser. Visual detection
          remains available.
        </p>
      )}

      <div className="setting-row">
        <div>
          <strong>Voice assistance</strong>
          <span>Allow spoken descriptions</span>
        </div>
        <button
          className={`switch ${preferences.enabled ? "switch--on" : ""}`}
          type="button"
          role="switch"
          aria-checked={preferences.enabled}
          disabled={!voice.supported}
          onClick={() => (preferences.enabled ? voice.mute() : voice.enable())}
        >
          <span />
          <span className="sr-only">
            {preferences.enabled ? "Turn voice off" : "Turn voice on"}
          </span>
        </button>
      </div>

      <fieldset className="settings-fieldset">
        <legend>Speech rate</legend>
        <div className="segmented-control">
          {(["slow", "normal", "fast"] as SpeechRate[]).map((rate) => (
            <button
              type="button"
              key={rate}
              aria-pressed={preferences.rate === rate}
              onClick={() => voice.updatePreferences({ rate })}
            >
              {rate}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings-fieldset">
        <legend>Announcement frequency</legend>
        <div className="segmented-control">
          {([3, 5, 10] as const).map((frequency) => (
            <button
              type="button"
              key={frequency}
              aria-pressed={preferences.frequency === frequency}
              onClick={() => voice.updatePreferences({ frequency })}
            >
              {frequency}s
            </button>
          ))}
        </div>
      </fieldset>

      <div className="setting-row">
        <div>
          <strong>Auto-announce</strong>
          <span>Speak when detected objects change</span>
        </div>
        <button
          className={`switch ${preferences.autoAnnounce ? "switch--on" : ""}`}
          type="button"
          role="switch"
          aria-checked={preferences.autoAnnounce}
          onClick={() =>
            voice.updatePreferences({
              autoAnnounce: !preferences.autoAnnounce,
            })
          }
        >
          <span />
          <span className="sr-only">
            {preferences.autoAnnounce
              ? "Turn automatic announcements off"
              : "Turn automatic announcements on"}
          </span>
        </button>
      </div>

      <button
        className="button button--secondary settings-test"
        type="button"
        disabled={!voice.supported}
        onClick={() =>
          voice.speak(
            "SensePath voice assistance is ready.",
            "navigation",
            true,
          )
        }
      >
        <Play size={18} />
        Test Voice
        <Volume2 size={18} />
      </button>
    </section>
  )
}
