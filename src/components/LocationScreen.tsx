import { useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  ShieldCheck,
  Volume2,
} from "lucide-react"
import type { GeolocationController } from "../hooks/useGeolocation"
import type { SpeechController } from "../hooks/useSpeech"

type Place = {
  displayName: string
  latitude: number
  longitude: number
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<Place> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("lat", String(latitude))
  url.searchParams.set("lon", String(longitude))
  url.searchParams.set("zoom", "18")
  url.searchParams.set("addressdetails", "1")
  const response = await fetch(url, {
    signal,
    headers: { "Accept-Language": navigator.language || "en" },
  })
  if (!response.ok) throw new Error("Reverse geocoding is unavailable.")
  const result = await response.json()
  if (!result.display_name) throw new Error("No nearby place name was found.")
  return {
    displayName: result.display_name,
    latitude,
    longitude,
  }
}

export function LocationScreen({
  locationService,
  voice,
  onBack,
  onNavigation,
}: {
  locationService: GeolocationController
  voice: SpeechController
  onBack: () => void
  onNavigation: () => void
}) {
  const [place, setPlace] = useState<Place | null>(null)
  const [placeStatus, setPlaceStatus] = useState<"idle" | "loading" | "error">(
    "idle",
  )
  const [placeError, setPlaceError] = useState("")
  const requestRef = useRef<AbortController | null>(null)
  const { location } = locationService

  useEffect(
    () => () => {
      requestRef.current?.abort()
    },
    [],
  )

  async function whereAmI() {
    if (!location) {
      locationService.enable()
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setPlaceStatus("loading")
    setPlaceError("")
    try {
      const found = await reverseGeocode(
        location.latitude,
        location.longitude,
        controller.signal,
      )
      setPlace(found)
      setPlaceStatus("idle")
      voice.speak(
        `Your approximate location is near ${found.displayName}.`,
        "navigation",
        true,
      )
    } catch (reason) {
      if (controller.signal.aborted) return
      setPlaceStatus("error")
      setPlaceError(
        reason instanceof Error
          ? reason.message
          : "A nearby place name could not be retrieved.",
      )
      voice.speak(
        `Your approximate coordinates are latitude ${location.latitude.toFixed(5)}, longitude ${location.longitude.toFixed(5)}.`,
        "navigation",
        true,
      )
    }
  }

  return (
    <main className="page utility-page">
      <header className="utility-header">
        <button
          className="icon-button"
          type="button"
          onClick={onBack}
          aria-label="Back to home"
        >
          <ArrowLeft size={22} />
        </button>
        <div>
          <p className="section-kicker">GPS assistance</p>
          <h1>My Location</h1>
        </div>
        <span
          className={`service-status service-status--${locationService.status}`}
          role="status"
        >
          <Radio size={15} />
          {locationService.status === "active"
            ? "GPS active"
            : locationService.status === "requesting"
              ? "Locating…"
              : "GPS off"}
        </span>
      </header>

      <div className="utility-content location-layout">
        <section className="location-card" aria-labelledby="location-heading">
          <div className="location-orb" aria-hidden="true">
            <span />
            <LocateFixed size={46} />
          </div>
          <p className="section-kicker">Current reading</p>
          <h2 id="location-heading">
            {place?.displayName || "Your location will appear here"}
          </h2>

          {location ? (
            <dl className="coordinate-grid">
              <div>
                <dt>Latitude</dt>
                <dd>{location.latitude.toFixed(6)}</dd>
              </div>
              <div>
                <dt>Longitude</dt>
                <dd>{location.longitude.toFixed(6)}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>Approximately ±{Math.round(location.accuracy)} m</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(location.timestamp).toLocaleTimeString()}</dd>
              </div>
            </dl>
          ) : (
            <p className="location-empty">
              Enable location when you are ready. SensePath never requests GPS
              access automatically.
            </p>
          )}

          {locationService.error && (
            <p className="inline-alert" role="alert">
              {locationService.error}
            </p>
          )}
          {placeError && (
            <p className="inline-alert" role="alert">
              {placeError}
            </p>
          )}

          <div className="location-actions">
            {!locationService.enabled ? (
              <button
                className="button button--primary button--large"
                type="button"
                onClick={locationService.enable}
              >
                <MapPin size={21} />
                Enable Location
              </button>
            ) : (
              <button
                className="button button--secondary button--large"
                type="button"
                onClick={locationService.disable}
              >
                <Radio size={20} />
                Disable Location
              </button>
            )}
            <button
              className="button button--secondary button--large"
              type="button"
              disabled={!location || placeStatus === "loading"}
              onClick={whereAmI}
            >
              <Volume2 size={21} />
              {placeStatus === "loading"
                ? "Finding nearby place…"
                : "Where Am I?"}
            </button>
          </div>
          <p className="data-disclosure">
            “Where Am I?” sends your current coordinates to OpenStreetMap
            Nominatim to find a nearby place name. Coordinates are not stored by
            SensePath.
          </p>
        </section>

        <aside className="location-side">
          <section className="info-card">
            <Clock3 size={22} />
            <div>
              <h2>Live updates</h2>
              <p>
                GPS refreshes while enabled and stops when you disable it or
                close SensePath.
              </p>
            </div>
          </section>
          <section className="info-card info-card--warning">
            <ShieldCheck size={22} />
            <div>
              <h2>Know the limits</h2>
              <p>
                GPS accuracy varies. It cannot identify curbs, obstacles, safe
                crossings, or an accessible pedestrian path.
              </p>
            </div>
          </section>
          <button
            className="button button--primary button--large location-nav-button"
            type="button"
            onClick={onNavigation}
          >
            <Navigation size={21} />
            Plan a Walking Route
          </button>
        </aside>
      </div>
    </main>
  )
}
