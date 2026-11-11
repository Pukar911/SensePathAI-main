import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Eye,
  Focus,
  Info,
  LockKeyhole,
  Map as MapIcon,
  MapPin,
  Minus,
  Navigation,
  Plus,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react"
import type { ObjectDetector as ObjectDetectorType } from "@mediapipe/tasks-vision"
import { LocationScreen } from "./components/LocationScreen"
import { NavigationScreen } from "./components/NavigationScreen"
import { VoiceControls } from "./components/VoiceControls"
import { VoiceSettings } from "./components/VoiceSettings"
import {
  type GeolocationController,
  useGeolocation,
} from "./hooks/useGeolocation"
import { type SpeechController, useSpeech } from "./hooks/useSpeech"
import {
  describeDetections,
  detectionSignature,
  type SpatialDetection,
} from "./utils/spatialDescription"

type Screen = "home" | "camera" | "how" | "location" | "navigation"
type TextSize = "default" | "large"

type Detection = SpatialDetection

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite"
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm"

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="SensePath">
      <span className="logo-mark" aria-hidden="true">
        <Eye size={compact ? 22 : 28} strokeWidth={1.8} />
        <Navigation className="logo-arrow" size={compact ? 10 : 12} />
      </span>
      <span
        className={compact ? "brand-name brand-name--compact" : "brand-name"}
      >
        SensePath
      </span>
    </div>
  )
}

function TextSizeControl({
  textSize,
  onChange,
}: {
  textSize: TextSize
  onChange: (size: TextSize) => void
}) {
  const isLarge = textSize === "large"
  return (
    <button
      className="text-control"
      type="button"
      aria-label={isLarge ? "Use standard text size" : "Use larger text size"}
      aria-pressed={isLarge}
      onClick={() => onChange(isLarge ? "default" : "large")}
    >
      <span aria-hidden="true">Aa</span>
      {isLarge ? <Minus size={16} /> : <Plus size={16} />}
    </button>
  )
}

function HomeScreen({
  onStart,
  onHow,
  onLocation,
  onNavigation,
  textSize,
  onTextSize,
}: {
  onStart: () => void
  onHow: () => void
  onLocation: () => void
  onNavigation: () => void
  textSize: TextSize
  onTextSize: (size: TextSize) => void
}) {
  const features = [
    {
      icon: ScanSearch,
      title: "Object Detection",
      description:
        "Identify everyday objects through your camera in real time.",
      available: true,
      action: onStart,
      actionLabel: "Open object detection",
    },
    {
      icon: Volume2,
      title: "Voice Guidance",
      description: "Hear clear spoken descriptions of the scene around you.",
      available: true,
      action: onStart,
      actionLabel: "Open voice-assisted detection",
    },
    {
      icon: MapPin,
      title: "GPS Location",
      description:
        "Check your live coordinates and hear a verified place name.",
      available: true,
      action: onLocation,
      actionLabel: "Open my location",
    },
    {
      icon: MapIcon,
      title: "Smart Navigation",
      description:
        "Search real destinations and request spoken walking routes.",
      available: true,
      action: onNavigation,
      actionLabel: "Open navigation",
    },
  ]

  return (
    <main className="page home-page">
      <nav className="nav-shell" aria-label="Primary navigation">
        <Logo />
        <div className="nav-actions">
          <button className="nav-link" type="button" onClick={onHow}>
            How it works
          </button>
          <TextSizeControl textSize={textSize} onChange={onTextSize} />
        </div>
      </nav>

      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="pulse-dot" aria-hidden="true" />
            AI-powered visual assistance
          </div>
          <p className="tagline">See Through Sound.</p>
          <h1 id="hero-heading">
            Your surroundings,
            <span> made understandable.</span>
          </h1>
          <p className="hero-description">
            Use your phone&apos;s camera and AI to recognize everyday objects
            around you — privately, clearly, and in real time.
          </p>
          <div className="hero-actions">
            <button
              className="button button--primary button--large"
              type="button"
              onClick={onStart}
            >
              <Camera size={22} aria-hidden="true" />
              Start Assistance
              <ArrowRight size={20} aria-hidden="true" />
            </button>
            <button
              className="button button--secondary button--large"
              type="button"
              onClick={onHow}
            >
              <Info size={21} aria-hidden="true" />
              How It Works
            </button>
          </div>
          <div className="privacy-note">
            <LockKeyhole size={18} aria-hidden="true" />
            <p>
              <strong>Built for privacy.</strong> Camera frames are processed in
              your browser and are never uploaded by SensePath.
            </p>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="radar-orbit radar-orbit--outer" />
          <div className="radar-orbit radar-orbit--inner" />
          <div className="visual-card">
            <div className="visual-topline">
              <span>
                <span className="status-dot" /> AI vision ready
              </span>
              <Focus size={19} />
            </div>
            <div className="viewfinder">
              <span className="corner corner--tl" />
              <span className="corner corner--tr" />
              <span className="corner corner--bl" />
              <span className="corner corner--br" />
              <Eye size={68} strokeWidth={1.2} />
              <div className="scan-line" />
            </div>
            <div className="visual-result">
              <span>Real-time recognition</span>
              <strong>On-device AI</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" aria-labelledby="features-heading">
        <div className="section-heading">
          <p className="section-kicker">Designed to grow with you</p>
          <h2 id="features-heading">One app, a clearer world</h2>
        </div>
        <div className="feature-grid">
          {features.map(
            (
              {
                icon: Icon,
                title,
                description,
                available,
                action,
                actionLabel,
              },
              index,
            ) => (
              <article
                className={`feature-card ${
                  available ? "feature-card--active" : ""
                }`}
                key={title}
              >
                <div className="feature-card__top">
                  <span className="feature-number">0{index + 1}</span>
                  <span className="feature-icon">
                    <Icon size={24} aria-hidden="true" />
                  </span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className={available ? "available-label" : "soon-label"}>
                  {available ? <Check size={14} /> : <Sparkles size={14} />}
                  {available ? "Available now" : "Coming soon"}
                </span>
                <button
                  className="feature-link"
                  type="button"
                  onClick={action}
                  aria-label={actionLabel}
                >
                  Open feature <ArrowRight size={16} />
                </button>
              </article>
            ),
          )}
        </div>
      </section>

      <aside
        className="safety-banner"
        aria-label="Important safety information"
      >
        <ShieldCheck size={25} aria-hidden="true" />
        <p>
          <strong>Awareness support, not a mobility aid.</strong> SensePath may
          miss objects. Continue using your usual mobility aids.
        </p>
      </aside>
    </main>
  )
}

function HowItWorks({
  onBack,
  onStart,
  textSize,
  onTextSize,
}: {
  onBack: () => void
  onStart: () => void
  textSize: TextSize
  onTextSize: (size: TextSize) => void
}) {
  const steps = [
    {
      icon: Camera,
      title: "Allow camera access",
      text: "SensePath asks for permission only after you choose to begin. Your camera stays under your control.",
    },
    {
      icon: Navigation,
      title: "Point toward your surroundings",
      text: "Slowly move your phone's rear camera toward the area you want to understand.",
    },
    {
      icon: ScanSearch,
      title: "Objects appear in real time",
      text: "EfficientDet AI identifies supported objects and shows its confidence for each result.",
    },
  ]

  return (
    <main className="page how-page">
      <nav className="nav-shell" aria-label="How it works navigation">
        <button
          className="icon-button back-button"
          type="button"
          onClick={onBack}
          aria-label="Back to home"
        >
          <ArrowLeft size={22} />
        </button>
        <Logo compact />
        <TextSizeControl textSize={textSize} onChange={onTextSize} />
      </nav>
      <section className="how-hero" aria-labelledby="how-heading">
        <p className="section-kicker">Simple by design</p>
        <h1 id="how-heading">Understand more in three steps.</h1>
        <p>
          SensePath turns a live camera view into clear object labels, without
          sending your camera feed to our servers.
        </p>
      </section>
      <section className="steps" aria-label="How SensePath works">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <article className="step-card" key={title}>
            <div className="step-marker">
              <span>0{index + 1}</span>
              <div className="step-icon">
                <Icon size={30} aria-hidden="true" />
              </div>
            </div>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="future-panel" aria-labelledby="future-heading">
        <div>
          <p className="section-kicker">Next on the path</p>
          <h2 id="future-heading">More ways to make sense of every place.</h2>
        </div>
        <ul>
          <li>
            <Eye size={19} /> Text recognition and reading aloud
          </li>
          <li>
            <Volume2 size={19} /> Expanded voice commands
          </li>
          <li>
            <MapIcon size={19} /> Accessibility-aware route data
          </li>
        </ul>
        <span className="soon-label">
          <Sparkles size={14} /> Coming soon
        </span>
      </section>
      <div className="how-cta">
        <button
          className="button button--primary button--large"
          type="button"
          onClick={onStart}
        >
          <Camera size={22} />
          Start Assistance
          <ArrowRight size={20} />
        </button>
      </div>
    </main>
  )
}

function CameraScreen({
  onExit,
  onLocation,
  voice,
  locationService,
}: {
  onExit: () => void
  onLocation: () => void
  voice: SpeechController
  locationService: GeolocationController
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<ObjectDetectorType | null>(null)
  const runIdRef = useRef(0)
  const lastVideoTimeRef = useRef(-1)
  const lastDetectionTimeRef = useRef(0)
  const lastAnnouncementTimeRef = useRef(0)
  const lastAnnouncementRef = useRef("")
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  const [detections, setDetections] = useState<Detection[]>([])
  const [status, setStatus] = useState<"starting" | "active" | "error">(
    "starting",
  )
  const [statusMessage, setStatusMessage] = useState(
    "Requesting camera access…",
  )
  const [error, setError] = useState("")
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)

  const stopResources = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    detectorRef.current?.close()
    detectorRef.current = null
  }, [])

  const fail = useCallback((message: string) => {
    if (!mountedRef.current) return
    setStatus("error")
    setError(message)
    setStatusMessage("Assistance unavailable")
  }, [])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => voice.cancel(), [voice.cancel])

  useEffect(() => {
    const runId = ++runIdRef.current
    mountedRef.current = true
    const isStale = () => !mountedRef.current || runId !== runIdRef.current

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        fail(
          "Camera access is not available in this browser or preview. Open SensePath in a secure, camera-enabled browser.",
        )
        return
      }

      try {
        setStatusMessage("Waiting for camera permission…")
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (isStale()) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setStatusMessage("Loading EfficientDet AI model…")
        const { FilesetResolver, ObjectDetector } = await import(
          "@mediapipe/tasks-vision"
        )
        const vision = await FilesetResolver.forVisionTasks(WASM_URL)
        const detector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          scoreThreshold: 0.45,
          maxResults: 10,
        })
        if (isStale()) {
          detector.close()
          return
        }
        detectorRef.current = detector
        setStatus("active")
        setStatusMessage("Camera and AI model active")

        const detect = () => {
          const video = videoRef.current
          const activeDetector = detectorRef.current
          if (video && activeDetector && video.readyState >= 2) {
            const now = performance.now()
            if (
              video.currentTime !== lastVideoTimeRef.current &&
              now - lastDetectionTimeRef.current >= 100
            ) {
              lastVideoTimeRef.current = video.currentTime
              lastDetectionTimeRef.current = now
              try {
                const result = activeDetector.detectForVideo(video, now)
                if (!isStale()) setDetections(result.detections as Detection[])
              } catch {
                fail(
                  "The AI model stopped processing video. Please return and try again.",
                )
                return
              }
            }
          }
          frameRef.current = requestAnimationFrame(detect)
        }
        detect()
      } catch (reason) {
        if (isStale()) return
        const exception = reason as DOMException
        if (
          exception?.name === "NotAllowedError" ||
          exception?.name === "PermissionDeniedError"
        ) {
          fail(
            "Camera permission was denied. Allow camera access in your browser settings, then try again.",
          )
        } else if (
          exception?.name === "NotFoundError" ||
          exception?.name === "DevicesNotFoundError"
        ) {
          fail(
            "No camera was found on this device. Connect or enable a camera, then try again.",
          )
        } else {
          fail(
            "SensePath could not start the camera or load the AI model. Check your connection and camera access, then try again.",
          )
        }
      }
    }

    start()
    return () => {
      if (runIdRef.current === runId) {
        mountedRef.current = false
        runIdRef.current += 1
      }
      stopResources()
    }
  }, [fail, stopResources])

  const uniqueObjects = useMemo(() => {
    const objects = new Map<string, number>()
    detections.forEach((detection) => {
      const category = detection.categories[0]
      if (!category) return
      const name = category.displayName || category.categoryName
      objects.set(name, Math.max(objects.get(name) || 0, category.score))
    })
    return Array.from(objects, ([name, score]) => ({ name, score })).sort(
      (a, b) => b.score - a.score,
    )
  }, [detections])

  useEffect(() => {
    if (
      status !== "active" ||
      !voice.preferences.enabled ||
      !voice.preferences.autoAnnounce ||
      !detections.length
    )
      return

    const signature = detectionSignature(detections, videoSize.width)
    const now = Date.now()
    if (
      !signature ||
      signature === lastAnnouncementRef.current ||
      now - lastAnnouncementTimeRef.current < voice.preferences.frequency * 1000
    )
      return

    const spoken = voice.speak(
      describeDetections(detections, videoSize.width),
      "routine",
    )
    if (spoken) {
      lastAnnouncementRef.current = signature
      lastAnnouncementTimeRef.current = now
    }
  }, [
    detections,
    status,
    videoSize.width,
    voice.preferences.autoAnnounce,
    voice.preferences.enabled,
    voice.preferences.frequency,
    voice.speak,
  ])

  function handleExit() {
    voice.cancel()
    stopResources()
    onExit()
  }

  function describeNow() {
    voice.speak(
      describeDetections(detections, videoSize.width),
      "navigation",
      true,
    )
  }

  function speakLocation() {
    if (!locationService.location) {
      voice.speak(
        "Location is not active. Use the My Location screen to enable GPS.",
        "navigation",
        true,
      )
      return
    }
    voice.speak(
      `Your approximate coordinates are latitude ${locationService.location.latitude.toFixed(5)}, longitude ${locationService.location.longitude.toFixed(5)}, with an accuracy of about ${Math.round(locationService.location.accuracy)} meters.`,
      "navigation",
      true,
    )
  }

  function getBoxStyle(box: NonNullable<Detection["boundingBox"]>) {
    if (!videoSize.width || !containerSize.width) return { display: "none" }
    const scale = Math.max(
      containerSize.width / videoSize.width,
      containerSize.height / videoSize.height,
    )
    const offsetX = (containerSize.width - videoSize.width * scale) / 2
    const offsetY = (containerSize.height - videoSize.height * scale) / 2
    return {
      left: `${offsetX + box.originX * scale}px`,
      top: `${offsetY + box.originY * scale}px`,
      width: `${box.width * scale}px`,
      height: `${box.height * scale}px`,
    }
  }

  return (
    <main className="camera-page">
      <header className="camera-header">
        <button
          className="icon-button"
          type="button"
          onClick={handleExit}
          aria-label="Stop assistance and go back"
        >
          <ArrowLeft size={23} />
        </button>
        <div className="camera-title">
          <Logo compact />
          <span className="header-divider" />
          <strong>AI Assistance</strong>
        </div>
        <div
          className={`live-status live-status--${status}`}
          role="status"
          aria-live="polite"
        >
          <span />
          <span className="status-full">{statusMessage}</span>
          <span className="status-short">
            {status === "active"
              ? "Active"
              : status === "error"
                ? "Error"
                : "Starting"}
          </span>
        </div>
        <button
          className={`camera-location-link ${
            locationService.status === "active"
              ? "camera-location-link--active"
              : ""
          }`}
          type="button"
          onClick={onLocation}
          aria-label={`Open My Location. GPS is ${
            locationService.status === "active" ? "active" : "off"
          }.`}
        >
          <MapPin size={17} />
          <span>
            {locationService.status === "active" ? "GPS active" : "GPS off"}
          </span>
        </button>
      </header>

      <div className="camera-layout">
        <section
          className="camera-stage"
          aria-label="Live camera and detected object boxes"
        >
          <div className="video-shell" ref={containerRef}>
            <video
              ref={videoRef}
              className="camera-video"
              playsInline
              muted
              aria-label="Live rear camera view"
              onLoadedMetadata={(event) =>
                setVideoSize({
                  width: event.currentTarget.videoWidth,
                  height: event.currentTarget.videoHeight,
                })
              }
            />
            {status === "starting" && (
              <div className="camera-loading" role="status">
                <div className="loader-ring" aria-hidden="true" />
                <strong>Preparing assistance</strong>
                <span>{statusMessage}</span>
              </div>
            )}
            {status === "error" && (
              <div className="camera-error" role="alert">
                <span className="error-icon">
                  <Camera size={28} />
                </span>
                <strong>We couldn&apos;t start assistance</strong>
                <p>{error}</p>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={handleExit}
                >
                  <ArrowLeft size={18} /> Return home
                </button>
              </div>
            )}
            {status === "active" &&
              detections.map((detection, index) => {
                const category = detection.categories[0]
                if (!detection.boundingBox || !category) return null
                const name = category.displayName || category.categoryName
                return (
                  <div
                    className="detection-box"
                    style={getBoxStyle(detection.boundingBox)}
                    key={`${name}-${index}`}
                    aria-hidden="true"
                  >
                    <span>
                      {name} · {Math.round(category.score * 100)}%
                    </span>
                  </div>
                )
              })}
            {status === "active" && (
              <>
                <div className="object-count">
                  <ScanSearch size={16} />
                  <strong>{detections.length}</strong>{" "}
                  {detections.length === 1 ? "object" : "objects"}
                </div>
                <div className="live-badge">
                  <span /> LIVE
                </div>
              </>
            )}
          </div>
          <p className="camera-safety">
            <Info size={16} /> SensePath may miss objects. Continue using your
            usual mobility aids.
          </p>
        </section>

        <aside className="results-panel" aria-labelledby="results-heading">
          <div className="results-heading">
            <div>
              <p className="section-kicker">Live results</p>
              <h1 id="results-heading">Objects Detected</h1>
            </div>
            <span
              className="result-count"
              aria-label={`${uniqueObjects.length} unique objects`}
            >
              {uniqueObjects.length.toString().padStart(2, "0")}
            </span>
          </div>
          <div className="results-list" aria-live="polite" aria-atomic="true">
            {status === "active" && uniqueObjects.length > 0 ? (
              uniqueObjects.map(({ name, score }) => (
                <div className="result-item" key={name}>
                  <span className="result-icon">
                    <Square size={17} />
                  </span>
                  <div>
                    <strong>{name}</strong>
                    <span>{Math.round(score * 100)}% confidence</span>
                  </div>
                  <div className="confidence-track" aria-hidden="true">
                    <span style={{ width: `${Math.round(score * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-results">
                <Focus size={32} />
                <strong>
                  {status === "active"
                    ? "Looking for objects"
                    : "Results will appear here"}
                </strong>
                <p>
                  {status === "active"
                    ? "Slowly point your camera toward your surroundings."
                    : "Camera and AI need to be active first."}
                </p>
              </div>
            )}
          </div>
          <VoiceControls
            voice={voice}
            onDescribe={describeNow}
            onWhereAmI={speakLocation}
            onStop={handleExit}
            onOpenSettings={() => setShowVoiceSettings(true)}
          />
          {showVoiceSettings && (
            <VoiceSettings
              voice={voice}
              onClose={() => setShowVoiceSettings(false)}
            />
          )}
          <div className="results-footer">
            <button
              className="button button--stop button--large"
              type="button"
              onClick={handleExit}
            >
              <Square size={19} fill="currentColor" />
              Stop Assistance
            </button>
            <p>
              <LockKeyhole size={15} /> Processed privately in this browser
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const voice = useSpeech()
  const locationService = useGeolocation()
  const [textSize, setTextSize] = useState<TextSize>(() =>
    localStorage.getItem("sensepath-text-size") === "large"
      ? "large"
      : "default",
  )

  function updateTextSize(size: TextSize) {
    setTextSize(size)
    localStorage.setItem("sensepath-text-size", size)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [screen])

  return (
    <div data-text-size={textSize}>
      {screen === "home" && (
        <HomeScreen
          onStart={() => setScreen("camera")}
          onHow={() => setScreen("how")}
          onLocation={() => setScreen("location")}
          onNavigation={() => setScreen("navigation")}
          textSize={textSize}
          onTextSize={updateTextSize}
        />
      )}
      {screen === "how" && (
        <HowItWorks
          onBack={() => setScreen("home")}
          onStart={() => setScreen("camera")}
          textSize={textSize}
          onTextSize={updateTextSize}
        />
      )}
      {screen === "camera" && (
        <CameraScreen
          onExit={() => setScreen("home")}
          onLocation={() => setScreen("location")}
          voice={voice}
          locationService={locationService}
        />
      )}
      {screen === "location" && (
        <LocationScreen
          locationService={locationService}
          voice={voice}
          onBack={() => setScreen("home")}
          onNavigation={() => setScreen("navigation")}
        />
      )}
      {screen === "navigation" && (
        <NavigationScreen
          locationService={locationService}
          voice={voice}
          onBack={() => setScreen("home")}
        />
      )}
    </div>
  )
}
