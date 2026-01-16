"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { STLLoader } from "three/addons/loaders/STLLoader.js"
import { OBJLoader } from "three/addons/loaders/OBJLoader.js"
import { MTLLoader } from "three/addons/loaders/MTLLoader.js"

interface Model3DViewerProps {
    file: File
    mtlFile?: File // Optional MTL file for OBJ
    className?: string
    hideOverlays?: boolean // Hide dimension and controls overlays
    onModelLoad?: (info: {
        width: number
        height: number
        depth: number
        volume: number
    }) => void
}

export default function Model3DViewer({ file, mtlFile, className, hideOverlays = false, onModelLoad }: Model3DViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const modelRef = useRef<THREE.Object3D | null>(null)
    const animationIdRef = useRef<number | null>(null)
    const onModelLoadRef = useRef(onModelLoad)
    const hasCalledOnLoadRef = useRef(false)

    // Keep the ref updated
    useEffect(() => {
        onModelLoadRef.current = onModelLoad
    }, [onModelLoad])

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [modelInfo, setModelInfo] = useState<{ width: number; height: number; depth: number } | null>(null)

    // Only re-run when file changes, not when callback changes
    useEffect(() => {
        if (!containerRef.current) return

        // Reset the load callback flag when file changes
        hasCalledOnLoadRef.current = false

        // Initialize Three.js scene
        const container = containerRef.current
        const width = container.clientWidth
        const height = container.clientHeight

        // Scene
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf8fafc) // slate-50
        sceneRef.current = scene

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
        camera.position.set(100, 100, 100)
        cameraRef.current = camera

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(width, height)
        renderer.setPixelRatio(window.devicePixelRatio)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.05
        controls.screenSpacePanning = false
        controls.minDistance = 10
        controls.maxDistance = 500
        controlsRef.current = controls

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
        directionalLight.position.set(50, 100, 50)
        directionalLight.castShadow = true
        scene.add(directionalLight)

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3)
        backLight.position.set(-50, 50, -50)
        scene.add(backLight)

        // Grid helper
        const gridHelper = new THREE.GridHelper(200, 20, 0xe2e8f0, 0xe2e8f0)
        scene.add(gridHelper)

        // Load model based on file type
        const fileName = file.name.toLowerCase()
        const fileUrl = URL.createObjectURL(file)

        const loadModel = async () => {
            setIsLoading(true)
            setError(null)

            try {
                let object: THREE.Object3D

                if (fileName.endsWith(".stl")) {
                    object = await loadSTL(fileUrl)
                } else if (fileName.endsWith(".obj")) {
                    object = await loadOBJ(fileUrl, mtlFile)
                } else {
                    throw new Error("Unsupported file format")
                }

                // Center and scale the model
                const box = new THREE.Box3().setFromObject(object)
                const center = box.getCenter(new THREE.Vector3())
                const size = box.getSize(new THREE.Vector3())

                object.position.sub(center)
                object.position.y += size.y / 2 // Sit on grid

                // Calculate scale to fit in view
                const maxDim = Math.max(size.x, size.y, size.z)
                if (maxDim > 100) {
                    const scale = 100 / maxDim
                    object.scale.setScalar(scale)
                }

                // Remove previous model
                if (modelRef.current) {
                    scene.remove(modelRef.current)
                }

                scene.add(object)
                modelRef.current = object

                // Update camera position based on model size
                const distance = Math.max(size.x, size.y, size.z) * 2
                camera.position.set(distance, distance, distance)
                controls.update()

                // Report model dimensions (in mm, assuming file is in mm)
                const dimensions = {
                    width: Math.round(size.x * 10) / 10,
                    height: Math.round(size.y * 10) / 10,
                    depth: Math.round(size.z * 10) / 10,
                }
                setModelInfo(dimensions)

                // Calculate approximate volume (very rough estimate)
                const volume = size.x * size.y * size.z * 0.3 // ~30% fill factor

                // Call onModelLoad only once per file
                if (onModelLoadRef.current && !hasCalledOnLoadRef.current) {
                    hasCalledOnLoadRef.current = true
                    onModelLoadRef.current({
                        ...dimensions,
                        volume: Math.round(volume * 10) / 10,
                    })
                }

                setIsLoading(false)
            } catch (err) {
                console.error("Model load error:", err)
                setError(err instanceof Error ? err.message : "Failed to load model")
                setIsLoading(false)
            }
        }

        loadModel()

        // Animation loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate)
            controls.update()
            renderer.render(scene, camera)
        }
        animate()

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return
            const newWidth = containerRef.current.clientWidth
            const newHeight = containerRef.current.clientHeight
            camera.aspect = newWidth / newHeight
            camera.updateProjectionMatrix()
            renderer.setSize(newWidth, newHeight)
        }
        window.addEventListener("resize", handleResize)

        // Cleanup
        return () => {
            window.removeEventListener("resize", handleResize)
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current)
            }
            URL.revokeObjectURL(fileUrl)
            renderer.dispose()
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement)
            }
        }
    }, [file, mtlFile]) // Removed onModelLoad from dependencies

    return (
        <div className={`relative ${className}`}>
            <div
                ref={containerRef}
                className="w-full h-full min-h-[300px] rounded-xl overflow-hidden"
            />

            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center rounded-xl">
                    <div className="text-center">
                        <div className="animate-spin mb-3">
                            <span className="material-symbols-outlined text-4xl text-primary">view_in_ar</span>
                        </div>
                        <p className="text-sm text-slate-500">Loading 3D model...</p>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div className="absolute inset-0 bg-red-50 flex items-center justify-center rounded-xl">
                    <div className="text-center p-6">
                        <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error</span>
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                </div>
            )}

            {/* Model info overlay */}
            {!hideOverlays && modelInfo && !isLoading && !error && (
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                    <p className="text-xs text-slate-500 font-mono">
                        {modelInfo.width} × {modelInfo.height} × {modelInfo.depth} mm
                    </p>
                </div>
            )}

            {/* Controls hint */}
            {!hideOverlays && !isLoading && !error && (
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
                    <p className="text-xs text-slate-400">
                        <span className="material-symbols-outlined text-sm align-middle mr-1">3d_rotation</span>
                        Drag to rotate
                    </p>
                </div>
            )}
        </div>
    )
}

// STL Loader
async function loadSTL(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
        const loader = new STLLoader()
        loader.load(
            url,
            (geometry) => {
                // Create material with nice 3D printing look
                const material = new THREE.MeshStandardMaterial({
                    color: 0xf97316, // Orange (primary color)
                    metalness: 0.1,
                    roughness: 0.6,
                })
                const mesh = new THREE.Mesh(geometry, material)
                mesh.castShadow = true
                mesh.receiveShadow = true
                resolve(mesh)
            },
            undefined,
            reject
        )
    })
}

// OBJ Loader (with optional MTL)
async function loadOBJ(objUrl: string, mtlFile?: File): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
        const objLoader = new OBJLoader()

        if (mtlFile) {
            const mtlUrl = URL.createObjectURL(mtlFile)
            const mtlLoader = new MTLLoader()

            mtlLoader.load(
                mtlUrl,
                (materials) => {
                    materials.preload()
                    objLoader.setMaterials(materials)

                    objLoader.load(
                        objUrl,
                        (object) => {
                            URL.revokeObjectURL(mtlUrl)
                            object.traverse((child) => {
                                if (child instanceof THREE.Mesh) {
                                    child.castShadow = true
                                    child.receiveShadow = true
                                }
                            })
                            resolve(object)
                        },
                        undefined,
                        reject
                    )
                },
                undefined,
                () => {
                    // MTL failed, load OBJ without materials
                    URL.revokeObjectURL(mtlUrl)
                    loadOBJOnly(objLoader, objUrl, resolve, reject)
                }
            )
        } else {
            loadOBJOnly(objLoader, objUrl, resolve, reject)
        }
    })
}

function loadOBJOnly(
    loader: OBJLoader,
    url: string,
    resolve: (obj: THREE.Object3D) => void,
    reject: (err: unknown) => void
) {
    loader.load(
        url,
        (object) => {
            // Apply default material if none
            object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    if (!child.material || (child.material as THREE.Material).type === "MeshBasicMaterial") {
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xf97316,
                            metalness: 0.1,
                            roughness: 0.6,
                        })
                    }
                    child.castShadow = true
                    child.receiveShadow = true
                }
            })
            resolve(object)
        },
        undefined,
        reject
    )
}
