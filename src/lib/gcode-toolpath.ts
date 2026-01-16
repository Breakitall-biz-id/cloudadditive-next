/**
 * G-code Toolpath Parser
 * Parses G0/G1 movement commands to extract 3D points for visualization
 */

export interface ToolpathPoint {
    x: number
    y: number
    z: number
    extrude: boolean  // true if extruding (G1 with E)
}

export interface ToolpathData {
    points: ToolpathPoint[]
    bounds: {
        minX: number
        maxX: number
        minY: number
        maxY: number
        minZ: number
        maxZ: number
    }
}

/**
 * Parse G-code file to extract toolpath points
 * Samples every Nth point for performance
 */
export async function parseGcodeToolpath(
    file: File,
    sampleRate: number = 5  // Keep 1 in N points
): Promise<ToolpathData> {
    const text = await file.text()
    return parseToolpathFromGcode(text, sampleRate)
}

export function parseToolpathFromGcode(
    gcode: string,
    sampleRate: number = 5
): ToolpathData {
    const points: ToolpathPoint[] = []

    let currentX = 0
    let currentY = 0
    let currentZ = 0
    let isAbsolute = true  // G90 absolute, G91 relative
    let pointCount = 0

    // Track bounds
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    const lines = gcode.split('\n')

    for (const line of lines) {
        const trimmed = line.trim()

        // Skip comments and empty lines
        if (trimmed.startsWith(';') || trimmed === '') continue

        // Remove inline comments
        const command = trimmed.split(';')[0].trim().toUpperCase()
        if (!command) continue

        // Check for coordinate mode
        if (command === 'G90') {
            isAbsolute = true
            continue
        }
        if (command === 'G91') {
            isAbsolute = false
            continue
        }

        // Parse G0 (rapid move) and G1 (linear move)
        if (command.startsWith('G0') || command.startsWith('G1')) {
            const isExtrude = command.startsWith('G1') && command.includes('E')

            // Parse coordinates
            const xMatch = command.match(/X(-?[\d.]+)/)
            const yMatch = command.match(/Y(-?[\d.]+)/)
            const zMatch = command.match(/Z(-?[\d.]+)/)

            if (xMatch || yMatch || zMatch) {
                if (isAbsolute) {
                    if (xMatch) currentX = parseFloat(xMatch[1])
                    if (yMatch) currentY = parseFloat(yMatch[1])
                    if (zMatch) currentZ = parseFloat(zMatch[1])
                } else {
                    if (xMatch) currentX += parseFloat(xMatch[1])
                    if (yMatch) currentY += parseFloat(yMatch[1])
                    if (zMatch) currentZ += parseFloat(zMatch[1])
                }

                // Update bounds
                minX = Math.min(minX, currentX)
                maxX = Math.max(maxX, currentX)
                minY = Math.min(minY, currentY)
                maxY = Math.max(maxY, currentY)
                minZ = Math.min(minZ, currentZ)
                maxZ = Math.max(maxZ, currentZ)

                // Sample points for performance
                pointCount++
                if (pointCount % sampleRate === 0) {
                    points.push({
                        x: currentX,
                        y: currentY,
                        z: currentZ,
                        extrude: isExtrude,
                    })
                }
            }
        }
    }

    // Handle edge case where no valid bounds found
    if (minX === Infinity) {
        minX = maxX = minY = maxY = minZ = maxZ = 0
    }

    return {
        points,
        bounds: { minX, maxX, minY, maxY, minZ, maxZ },
    }
}

/**
 * Get summary stats for the toolpath
 */
export function getToolpathStats(data: ToolpathData) {
    const extrudePoints = data.points.filter(p => p.extrude).length
    const travelPoints = data.points.filter(p => !p.extrude).length

    return {
        totalPoints: data.points.length,
        extrudePoints,
        travelPoints,
        sizeX: data.bounds.maxX - data.bounds.minX,
        sizeY: data.bounds.maxY - data.bounds.minY,
        sizeZ: data.bounds.maxZ - data.bounds.minZ,
    }
}
