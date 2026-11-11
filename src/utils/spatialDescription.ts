export type SpatialDetection = {
  boundingBox?: {
    originX: number
    originY: number
    width: number
    height: number
  }
  categories: Array<{
    categoryName: string
    displayName?: string
    score: number
  }>
}

function pluralize(name: string, count: number) {
  if (count === 1) return name
  if (name.endsWith("s")) return name
  if (name.endsWith("y") && !/[aeiou]y$/i.test(name))
    return `${name.slice(0, -1)}ies`
  return `${name}s`
}

function countWord(count: number) {
  return ["zero", "one", "two", "three", "four", "five"][count] || String(count)
}

export function describeDetections(
  detections: SpatialDetection[],
  frameWidth: number,
) {
  if (!detections.length || !frameWidth)
    return "No supported objects are currently recognized."

  const grouped = new Map<string, {
    count: number
    positions: Set<"left" | "center" | "right">
  }>()

  detections.forEach((detection) => {
    const category = detection.categories[0]
    const box = detection.boundingBox
    if (!category || !box) return
    const name = (category.displayName || category.categoryName).toLowerCase()
    const center = (box.originX + box.width / 2) / frameWidth
    const position = center < 0.36 ? "left" : center > 0.64 ? "right" : "center"
    const existing = grouped.get(name) || { count: 0, positions: new Set() }
    existing.count += 1
    existing.positions.add(position)
    grouped.set(name, existing)
  })

  if (!grouped.size) return "No supported objects are currently recognized."

  return Array.from(grouped, ([name, value]) => {
    if (value.count > 1) {
      return `${countWord(value.count)} ${pluralize(name, value.count)} detected in the camera image.`
    }
    const position = Array.from(value.positions)[0]
    const positionText =
      position === "center"
        ? "near the center of the camera image"
        : `on the ${position} side of the camera image`
    return `${name} detected ${positionText}.`
  }).join(" ")
}

export function detectionSignature(
  detections: SpatialDetection[],
  frameWidth: number,
) {
  if (!frameWidth) return ""
  return detections
    .map((detection) => {
      const category = detection.categories[0]
      const box = detection.boundingBox
      if (!category || !box) return ""
      const center = (box.originX + box.width / 2) / frameWidth
      const position =
        center < 0.36 ? "left" : center > 0.64 ? "right" : "center"
      return `${category.displayName || category.categoryName}:${position}`
    })
    .filter(Boolean)
    .sort()
    .join("|")
}
