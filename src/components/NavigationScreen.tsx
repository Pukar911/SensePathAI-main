import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  LocateFixed,
  MapPin,
  Navigation,
  Repeat2,
  Route,
  Search,
  ShieldAlert,
  Square,
  Volume2,
} from "lucide-react"
import type { GeolocationController } from "../hooks/useGeolocation"
import type { SpeechController } from "../hooks/useSpeech"

type Destination = {
  placeId: number
  name: string
  latitude: number
  longitude: number
}

type RouteStep = {
  distance: number
  duration: number
  name: string
  maneuver: {
    type: string
    modifier?: string
    location: [number, number]
  }
}

type WalkingRoute = {
  distance: number
  duration: number
  steps: RouteStep[]
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`
}

function stepInstruction(step: RouteStep, isLast = false) {
  if (isLast || step.maneuver.type === "arrive")
    return "Arrive near the destination area."

  const road = step.name ? ` onto ${step.name}` : ""
  const modifier = step.maneuver.modifier?.replace("-", " ")
  const distance = step.distance
    ? ` Continue for ${formatDistance(step.distance)}.`
    : ""

  if (step.maneuver.type === "depart") return `Begin walking${road}.${distance}`
  if (step.maneuver.type === "turn")
    return `Turn ${modifier || ""}${road}.${distance}`.replace("  ", " ")
  if (step.maneuver.type === "roundabout")
    return `Enter the roundabout${road}.${distance}`
  if (step.maneuver.type === "merge")
    return `Merge ${modifier || ""}${road}.${distance}`.replace("  ", " ")
  if (step.maneuver.type === "fork")
    return `Keep ${modifier || "ahead"}${road}.${distance}`
  if (step.maneuver.type === "continue")
    return `Continue ${modifier || "ahead"}${road}.${distance}`
  return `Continue${road}.${distance}`
}

function distanceBetween(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const earthRadius = 6371000
  const latDelta = radians(latitudeB - latitudeA)
  const lonDelta = radians(longitudeB - longitudeA)
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(radians(latitudeA)) *
      Math.cos(radians(latitudeB)) *
      Math.sin(lonDelta / 2) ** 2
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function NavigationScreen({
  locationService,
  voice,
  onBack,
}: {
  locationService: GeolocationController
  voice: SpeechController
  onBack: () => void
}) {
  const [query, setQuery] = useState("")
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [destination, setDestination] = useState<Destination | null>(null)
  const [route, setRoute] = useState<WalkingRoute | null>(null)
  const [searching, setSearching] = useState(false)
  const [routing, setRouting] = useState(false)
  const [error, setError] = useState("")
  const [navigating, setNavigating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const reachedRef = useRef(false)
  const searchRequestRef = useRef<AbortController | null>(null)
  const routeRequestRef = useRef<AbortController | null>(null)
  const { location } = locationService

  const instructions = useMemo(
    () =>
      route?.steps.map((step, index) =>
        stepInstruction(step, index === route.steps.length - 1),
      ) || [],
    [route],
  )

  useEffect(
    () => () => {
      searchRequestRef.current?.abort()
      routeRequestRef.current?.abort()
      voice.cancel()
    },
    [voice.cancel],
  )

  useEffect(() => {
    if (!navigating || !location || !route?.steps[currentStep]) return
    const target = route.steps[currentStep].maneuver.location
    const meters = distanceBetween(
      location.latitude,
      location.longitude,
      target[1],
      target[0],
    )

    if (meters <= 25 && currentStep < route.steps.length - 1) {
      const next = currentStep + 1
      setCurrentStep(next)
      voice.speak(
        `Your next navigation instruction is: ${instructions[next]}`,
        "navigation",
        true,
      )
    } else if (
      meters <= 35 &&
      currentStep === route.steps.length - 1 &&
      !reachedRef.current
    ) {
      reachedRef.current = true
      voice.speak(
        "You are near the destination area. Continue using your usual mobility aids.",
        "navigation",
        true,
      )
    }
  }, [currentStep, instructions, location, navigating, route, voice.speak])

  async function searchDestinations(event: FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    searchRequestRef.current?.abort()
    const controller = new AbortController()
    searchRequestRef.current = controller
    setSearching(true)
    setError("")
    setDestinations([])
    setDestination(null)
    setRoute(null)
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search")
      url.searchParams.set("format", "jsonv2")
      url.searchParams.set("q", query.trim())
      url.searchParams.set("limit", "5")
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "Accept-Language": navigator.language || "en" },
      })
      if (!response.ok) throw new Error("Destination search is unavailable.")
      const results = await response.json()
      setDestinations(
        results.map(
          (result: {
            place_id: number
            display_name: string
            lat: string
            lon: string
          }) => ({
            placeId: result.place_id,
            name: result.display_name,
            latitude: Number(result.lat),
            longitude: Number(result.lon),
          }),
        ),
      )
      if (!results.length)
        setError(
          "No matching destinations were found. Try a more specific search.",
        )
    } catch (reason) {
      if (controller.signal.aborted) return
      setError(
        reason instanceof Error ? reason.message : "Destination search failed.",
      )
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }

  async function createRoute() {
    if (!location || !destination) return
    routeRequestRef.current?.abort()
    const controller = new AbortController()
    routeRequestRef.current = controller
    setRouting(true)
    setError("")
    setRoute(null)
    try {
      const coordinates = `${location.longitude},${location.latitude};${destination.longitude},${destination.latitude}`
      const url = new URL(
        `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordinates}`,
      )
      url.searchParams.set("overview", "false")
      url.searchParams.set("steps", "true")
      url.searchParams.set("alternatives", "false")
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok)
        throw new Error("The walking route service is currently unavailable.")
      const result = await response.json()
      const foundRoute = result.routes?.[0]
      const steps = foundRoute?.legs?.flatMap(
        (leg: { steps: RouteStep[] }) => leg.steps,
      )
      if (!foundRoute || !steps?.length)
        throw new Error("No verified walking route was returned.")
      setRoute({
        distance: foundRoute.distance,
        duration: foundRoute.duration,
        steps,
      })
      setCurrentStep(0)
    } catch (reason) {
      if (controller.signal.aborted) return
      setError(
        reason instanceof Error
          ? reason.message
          : "A route could not be created.",
      )
    } finally {
      if (!controller.signal.aborted) setRouting(false)
    }
  }

  function startNavigation() {
    if (!route) return
    reachedRef.current = false
    setNavigating(true)
    setCurrentStep(0)
    voice.speak(
      `Walking guidance started. Your destination is approximately ${formatDistance(route.distance)} away. ${instructions[0]}`,
      "navigation",
      true,
    )
  }

  function stopNavigation() {
    voice.cancel()
    setNavigating(false)
    reachedRef.current = false
  }

  function repeatInstruction() {
    if (!instructions[currentStep]) return
    voice.speak(
      `Your current navigation instruction is: ${instructions[currentStep]}`,
      "navigation",
      true,
    )
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
          <p className="section-kicker">OpenStreetMap walking routes</p>
          <h1>Navigation</h1>
        </div>
        <span
          className={`service-status ${
            navigating ? "service-status--active" : ""
          }`}
          role="status"
        >
          <Navigation size={15} />
          {navigating ? "Guidance active" : "Not navigating"}
        </span>
      </header>

      <div className="utility-content navigation-layout">
        <section className="navigation-main">
          <div className="route-builder">
            <div className="route-origin">
              <LocateFixed size={20} />
              <div>
                <span>Starting point</span>
                <strong>
                  {location
                    ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                    : "Current location required"}
                </strong>
              </div>
              {!locationService.enabled && (
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={locationService.enable}
                >
                  Enable GPS
                </button>
              )}
            </div>
            <form className="destination-search" onSubmit={searchDestinations}>
              <label htmlFor="destination">Destination</label>
              <div>
                <MapPin size={20} />
                <input
                  id="destination"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for a place or address"
                  autoComplete="street-address"
                />
                <button
                  className="search-submit"
                  type="submit"
                  disabled={searching || !query.trim()}
                  aria-label="Search destination"
                >
                  <Search size={20} />
                </button>
              </div>
            </form>

            {destinations.length > 0 && !destination && (
              <ul className="search-results" aria-label="Destination results">
                {destinations.map((result) => (
                  <li key={result.placeId}>
                    <button
                      type="button"
                      onClick={() => setDestination(result)}
                    >
                      <MapPin size={18} />
                      <span>{result.name}</span>
                      <ChevronRight size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {destination && (
              <div className="selected-destination">
                <MapPin size={21} />
                <div>
                  <span>Selected destination</span>
                  <strong>{destination.name}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDestination(null)
                    setRoute(null)
                  }}
                >
                  Change
                </button>
              </div>
            )}

            {error && (
              <p className="inline-alert" role="alert">
                {error}
              </p>
            )}
            {locationService.error && (
              <p className="inline-alert" role="alert">
                {locationService.error}
              </p>
            )}

            {destination && !route && (
              <button
                className="button button--primary button--large create-route"
                type="button"
                disabled={!location || routing}
                onClick={createRoute}
              >
                <Route size={21} />
                {routing ? "Requesting walking route…" : "Create Walking Route"}
              </button>
            )}
            <p className="data-disclosure">
              Search uses OpenStreetMap Nominatim. Creating a route sends your
              current and selected coordinates to the OpenStreetMap.de foot
              routing service. SensePath does not store them.
            </p>
          </div>

          {route && (
            <section
              className="directions-card"
              aria-labelledby="directions-heading"
            >
              <div className="route-summary">
                <div>
                  <Route size={20} />
                  <span>Walking distance</span>
                  <strong>{formatDistance(route.distance)}</strong>
                </div>
                <div>
                  <Clock3 size={20} />
                  <span>Estimated time</span>
                  <strong>{formatDuration(route.duration)}</strong>
                </div>
              </div>
              <div className="directions-heading">
                <div>
                  <p className="section-kicker">Verified route steps</p>
                  <h2 id="directions-heading">Directions</h2>
                </div>
                <span>{instructions.length} steps</span>
              </div>
              <ol className="directions-list">
                {instructions.map((instruction, index) => (
                  <li
                    className={
                      navigating && index === currentStep
                        ? "direction--current"
                        : ""
                    }
                    key={`${instruction}-${index}`}
                  >
                    <span>{index + 1}</span>
                    <p>{instruction}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </section>

        <aside className="navigation-side">
          {route ? (
            <section className="guidance-card">
              <p className="section-kicker">
                {navigating ? "Current instruction" : "Route ready"}
              </p>
              <Volume2 size={28} />
              <h2>
                {navigating
                  ? instructions[currentStep]
                  : "Start when you are ready."}
              </h2>
              {navigating ? (
                <>
                  <button
                    className="button button--secondary button--large"
                    type="button"
                    onClick={repeatInstruction}
                  >
                    <Repeat2 size={20} /> Repeat Instruction
                  </button>
                  <button
                    className="button button--stop button--large"
                    type="button"
                    onClick={stopNavigation}
                  >
                    <Square size={18} fill="currentColor" /> Stop Navigation
                  </button>
                </>
              ) : (
                <button
                  className="button button--primary button--large"
                  type="button"
                  onClick={startNavigation}
                >
                  <Navigation size={20} /> Start Navigation
                </button>
              )}
            </section>
          ) : (
            <section className="guidance-card guidance-card--empty">
              <Navigation size={30} />
              <h2>Plan a route to begin</h2>
              <p>
                Search, select a real destination, and request a walking route.
                No route details are simulated.
              </p>
            </section>
          )}
          <section className="navigation-warning">
            <ShieldAlert size={22} />
            <p>
              <strong>Navigation is supplemental.</strong> Routes may not
              include accessibility conditions or temporary hazards. Never use
              SensePath alone to decide when it is safe to cross.
            </p>
          </section>
        </aside>
      </div>
    </main>
  )
}
