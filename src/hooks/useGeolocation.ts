import { useCallback, useEffect, useRef, useState } from "react"

export type LocationReading = {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export type LocationStatus = "idle" | "requesting" | "active" | "denied" | "unavailable" | "timeout" | "unsupported"

export function useGeolocation() {
  const supported =
    typeof navigator !== "undefined" && "geolocation" in navigator
  const watcherRef = useRef<number | null>(null)
  const [status, setStatus] = useState<LocationStatus>("idle")
  const [location, setLocation] = useState<LocationReading | null>(null)
  const [error, setError] = useState("")

  const disable = useCallback(() => {
    if (watcherRef.current !== null && supported) {
      navigator.geolocation.clearWatch(watcherRef.current)
      watcherRef.current = null
    }
    setStatus("idle")
    setError("")
  }, [supported])

  const enable = useCallback(() => {
    if (!supported) {
      setStatus("unsupported")
      setError("Location services are not supported by this browser.")
      return
    }
    if (!window.isSecureContext) {
      setStatus("unavailable")
      setError("Location access requires HTTPS or localhost.")
      return
    }
    if (watcherRef.current !== null) return

    setStatus("requesting")
    setError("")
    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        })
        setStatus("active")
        setError("")
      },
      (reason) => {
        watcherRef.current = null
        if (reason.code === reason.PERMISSION_DENIED) {
          setStatus("denied")
          setError(
            "Location permission was denied. You can change this in your browser settings.",
          )
        } else if (reason.code === reason.TIMEOUT) {
          setStatus("timeout")
          setError(
            "Location request timed out. Move to an open area and try again.",
          )
        } else {
          setStatus("unavailable")
          setError("Your current location could not be determined.")
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    )
  }, [supported])

  useEffect(() => disable, [disable])

  return {
    supported,
    status,
    location,
    error,
    enabled: status === "requesting" || status === "active",
    enable,
    disable,
  }
}

export type GeolocationController = ReturnType<typeof useGeolocation>
