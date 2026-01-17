"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { parseGcodeToolpath, ToolpathData } from "@/lib/gcode-toolpath"

interface Gcode3DViewerProps {
    file: File
    className?: string
}

export function Gcode3DViewer({ file, className = "" }: Gcode3DViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<{
        points: number
        sizeX: number
        sizeY: number
        sizeZ: number
    } | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        let mounted = true
        let renderer: THREE.WebGLRenderer | null = null
        let animationId: number | null = null

        const initViewer = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Parse toolpath
                const toolpathData = await parseGcodeToolpath(file, 3)

                if (!mounted) return

                if (toolpathData.points.length === 0) {
                    setError("No toolpath data found in G-code")
                    setIsLoading(false)
                    return
                }

                // Calculate stats
                const bounds = toolpathData.bounds
                setStats({
                    points: toolpathData.points.length,
                    sizeX: Math.round((bounds.maxX - bounds.minX) * 10) / 10,
                    sizeY: Math.round((bounds.maxY - bounds.minY) * 10) / 10,
                    sizeZ: Math.round((bounds.maxZ - bounds.minZ) * 10) / 10,
                })

                // Setup scene
                const scene = new THREE.Scene()
                scene.background = new THREE.Color(0x1a1a2e)

                // Setup camera
                const width = containerRef.current!.clientWidth
                const height = containerRef.current!.clientHeight
                const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 10000)

                // Setup renderer
                renderer = new THREE.WebGLRenderer({ antialias: true })
                renderer.setSize(width, height)
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
                containerRef.current!.appendChild(renderer.domElement)

                // Setup controls
                const controls = new OrbitControls(camera, renderer.domElement)
                controls.enableDamping = true
                controls.dampingFactor = 0.05

                // Create toolpath geometry
                createToolpath(scene, toolpathData)

                // Create bed grid
                createBedGrid(scene, toolpathData.bounds)

                // Center camera on model
                centerCamera(camera, toolpathData.bounds)

                // Add lights
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
                scene.add(ambientLight)
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
                directionalLight.position.set(100, 100, 100)
                scene.add(directionalLight)

                setIsLoading(false)

                // Animation loop
                const animate = () => {
                    animationId = requestAnimationFrame(animate)
                    controls.update()
                    renderer!.render(scene, camera)
                }
                animate()

                // Handle resize
                const handleResize = () => {
                    if (!containerRef.current || !renderer) return
                    const w = containerRef.current.clientWidth
                    const h = containerRef.current.clientHeight
                    camera.aspect = w / h
                    camera.updateProjectionMatrix()
                    renderer.setSize(w, h)
                }
                window.addEventListener('resize', handleResize)

                return () => {
                    window.removeEventListener('resize', handleResize)
                }

            } catch (err) {
                console.error("G-code viewer error:", err)
                setError("Failed to parse G-code file")
                setIsLoading(false)
            }
        }

        initViewer()

        return () => {
            mounted = false
            if (animationId) cancelAnimationFrame(animationId)
            if (renderer && containerRef.current) {
                containerRef.current.removeChild(renderer.domElement)
                renderer.dispose()
            }
        }
    }, [file])

    return (
        <div className={`relative bg-slate-900 overflow-hidden ${className}`}>
            <div ref={containerRef} className="absolute inset-0" />

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
                            progress_activity
                        </span>
                        <span className="text-slate-400 text-sm">Parsing toolpath...</span>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 text-center p-4">
                        <span className="material-symbols-outlined text-4xl text-red-400">
                            error
                        </span>
                        <span className="text-red-400 text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* Stats overlay */}
            {stats && !isLoading && !error && (
                <div className="absolute bottom-3 left-3 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-300">
                    <div className="flex gap-4">
                        <span>Size: {stats.sizeX} × {stats.sizeY} × {stats.sizeZ} mm</span>
                        <span className="text-slate-500">|</span>
                        <span>{stats.points.toLocaleString()} points</span>
                    </div>
                </div>
            )}

            {/* Legend */}
            {!isLoading && !error && (
                <div className="absolute top-3 right-3 bg-slate-800/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
                    <div className="flex gap-3">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-orange-400 rounded" />
                            <span className="text-slate-300">Extrude</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-cyan-400 rounded" />
                            <span className="text-slate-300">Travel</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function createToolpath(scene: THREE.Scene, data: ToolpathData) {
    const extrudePoints: THREE.Vector3[] = []
    const travelPoints: THREE.Vector3[] = []

    let prevPoint: ToolpathData['points'][0] | null = null

    for (const point of data.points) {
        if (prevPoint) {
            const from = new THREE.Vector3(prevPoint.x, prevPoint.z, -prevPoint.y)
            const to = new THREE.Vector3(point.x, point.z, -point.y)

            if (point.extrude) {
                extrudePoints.push(from, to)
            } else {
                travelPoints.push(from, to)
            }
        }
        prevPoint = point
    }

    // Extrude lines (orange)
    if (extrudePoints.length > 0) {
        const extrudeGeometry = new THREE.BufferGeometry().setFromPoints(extrudePoints)
        const extrudeMaterial = new THREE.LineBasicMaterial({
            color: 0xff9500,
            linewidth: 1,
        })
        const extrudeLines = new THREE.LineSegments(extrudeGeometry, extrudeMaterial)
        scene.add(extrudeLines)
    }

    // Travel lines (cyan, more transparent)
    if (travelPoints.length > 0) {
        const travelGeometry = new THREE.BufferGeometry().setFromPoints(travelPoints)
        const travelMaterial = new THREE.LineBasicMaterial({
            color: 0x00d4ff,
            linewidth: 1,
            transparent: true,
            opacity: 0.3,
        })
        const travelLines = new THREE.LineSegments(travelGeometry, travelMaterial)
        scene.add(travelLines)
    }
}

function createBedGrid(scene: THREE.Scene, bounds: ToolpathData['bounds']) {
    const sizeX = bounds.maxX - bounds.minX
    const sizeY = bounds.maxY - bounds.minY
    const gridSize = Math.max(sizeX, sizeY) * 1.5
    const divisions = Math.ceil(gridSize / 10)

    const grid = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x333333)
    grid.position.set(
        (bounds.minX + bounds.maxX) / 2,
        0,
        -(bounds.minY + bounds.maxY) / 2
    )
    scene.add(grid)
}

function centerCamera(camera: THREE.PerspectiveCamera, bounds: ToolpathData['bounds']) {
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    const centerZ = (bounds.minZ + bounds.maxZ) / 2

    const sizeX = bounds.maxX - bounds.minX
    const sizeY = bounds.maxY - bounds.minY
    const sizeZ = bounds.maxZ - bounds.minZ
    const maxSize = Math.max(sizeX, sizeY, sizeZ)

    // Position camera
    const distance = maxSize * 1.5
    camera.position.set(
        centerX + distance * 0.7,
        centerZ + distance * 0.5,
        -centerY + distance * 0.7
    )
    camera.lookAt(centerX, centerZ, -centerY)
}
