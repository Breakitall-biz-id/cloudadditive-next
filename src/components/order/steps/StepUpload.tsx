"use client"

import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"
import { isGcodeFile, parseGcodeFile, formatPrintTime, type GcodeParseResult } from "@/lib/gcode-parser"
import { Gcode3DViewer } from "@/components/order/Gcode3DViewer"

interface StepUploadProps {
    wizard: UseOrderWizardReturn
}

export function StepUpload({ wizard }: StepUploadProps) {
    const { state, actions } = wizard
    const [gcodePreview, setGcodePreview] = useState<GcodeParseResult | null>(null)
    const [isParsing, setIsParsing] = useState(false)
    const [showPreview, setShowPreview] = useState(false)

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            actions.setFile(acceptedFiles[0])
        }
    }, [actions])

    // Parse G-code file when uploaded
    useEffect(() => {
        if (state.file && isGcodeFile(state.file)) {
            setIsParsing(true)
            parseGcodeFile(state.file)
                .then(stats => {
                    setGcodePreview(stats)
                })
                .catch(console.error)
                .finally(() => setIsParsing(false))
        } else {
            setGcodePreview(null)
            setShowPreview(false)
        }
    }, [state.file])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "model/stl": [".stl"],
            "model/obj": [".obj"],
            "application/octet-stream": [".stl", ".obj", ".gcode"],
        },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024,
    })

    const fileIsGcode = state.file ? isGcodeFile(state.file) : false
    const compatibility = gcodePreview?.compatibility

    return (
        <>
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">01 Upload Files</h2>
                <p className="text-slate-500 max-w-xl">
                    Initial processing and validation of your additive manufacturing geometry. Supports STL, OBJ, and G-CODE formats.
                </p>
            </div>

            {/* Dropzone */}
            <div {...getRootProps()} className="group relative cursor-pointer">
                <div className={`flex flex-col items-center justify-center gap-8 rounded-xl border-2 border-dashed px-6 py-24 transition-all ${isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-slate-300 bg-white hover:border-primary/50 hover:bg-primary/5"
                    }`}>
                    <input {...getInputProps()} />
                    <div className="size-20 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 group-hover:bg-white group-hover:border-primary/40 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all">
                        <span className="material-symbols-outlined text-4xl text-slate-400 group-hover:text-primary">cloud_upload</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-slate-900 text-xl font-bold tracking-tight">
                            {isDragActive ? "Drop file here..." : "Drop your G-code or STL file here"}
                        </p>
                        <p className="text-slate-500 text-sm">Max single file size: <span className="text-slate-900 font-mono font-bold">50MB</span></p>
                    </div>
                    <button type="button" className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-900 rounded-xl font-bold transition-all hover:shadow-md active:scale-95">
                        <span className="material-symbols-outlined text-sm">folder_open</span>
                        <span>Select Files</span>
                    </button>
                </div>
            </div>

            {/* Uploaded File */}
            {state.file && (
                <div className="flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">Recently Uploaded</h4>
                    <div className="bg-white rounded-xl p-5 border border-primary/20 flex items-center justify-between shadow-lg shadow-primary/5 ring-1 ring-primary/5">
                        <div className="flex items-center gap-5">
                            <div className={`size-12 rounded-lg flex items-center justify-center border ${fileIsGcode ? 'bg-violet-100 border-violet-200' : 'bg-primary/10 border-primary/20'}`}>
                                <span className={`material-symbols-outlined ${fileIsGcode ? 'text-violet-600' : 'text-primary'}`}>
                                    {fileIsGcode ? 'code' : 'view_in_ar'}
                                </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <p className="text-slate-900 font-bold">{state.file.name}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                                    <span className="font-bold">{(state.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                                    {fileIsGcode && gcodePreview && (
                                        <>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-violet-600 font-bold">{formatPrintTime(gcodePreview.printTimeMinutes)}</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-violet-600 font-bold">{gcodePreview.filamentGrams.toFixed(1)}g</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-violet-600 font-bold">{gcodePreview.layerCount} layers</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isParsing ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                    <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                                    Parsing
                                </div>
                            ) : (
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${fileIsGcode
                                    ? 'bg-violet-50 border border-violet-200 text-violet-600'
                                    : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                                    }`}>
                                    <span className="material-symbols-outlined text-xs">check_circle</span>
                                    {fileIsGcode ? 'G-CODE' : 'STL'}
                                </div>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); actions.setFile(null); setGcodePreview(null); }}
                                className="size-10 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400 transition-colors flex items-center justify-center border border-transparent hover:border-red-100"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* G-code Printer Specs */}
            {fileIsGcode && compatibility && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Detected Printer Settings</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {compatibility.bedSizeX && compatibility.bedSizeY && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Bed Size</span>
                                <span className="text-sm font-bold text-slate-900">{compatibility.bedSizeX} × {compatibility.bedSizeY} mm</span>
                            </div>
                        )}
                        {compatibility.nozzleDiameter && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Nozzle</span>
                                <span className="text-sm font-bold text-slate-900">{compatibility.nozzleDiameter} mm</span>
                            </div>
                        )}
                        {compatibility.layerHeight && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Layer Height</span>
                                <span className="text-sm font-bold text-slate-900">{compatibility.layerHeight} mm</span>
                            </div>
                        )}
                        {compatibility.nozzleTemp && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Nozzle Temp</span>
                                <span className="text-sm font-bold text-slate-900">{compatibility.nozzleTemp}°C</span>
                            </div>
                        )}
                        {compatibility.bedTemp && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Bed Temp</span>
                                <span className="text-sm font-bold text-slate-900">{compatibility.bedTemp}°C</span>
                            </div>
                        )}
                        {gcodePreview?.flavor && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Firmware</span>
                                <span className="text-sm font-bold text-slate-900">{gcodePreview.flavor}</span>
                            </div>
                        )}
                        {gcodePreview?.slicer && (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400">Slicer</span>
                                <span className="text-sm font-bold text-slate-900">{gcodePreview.slicer}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Compatibility Warnings */}
            {fileIsGcode && compatibility && compatibility.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-amber-500 flex-shrink-0">warning</span>
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-bold text-amber-700">Compatibility Warnings</p>
                            <ul className="text-xs text-amber-600 space-y-1">
                                {compatibility.warnings.map((warning, i) => (
                                    <li key={i}>• {warning}</li>
                                ))}
                            </ul>
                            <p className="text-xs text-amber-600 mt-1">
                                Your G-code may not be compatible with all printers. Consider uploading an STL file instead for automatic slicing.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* G-code 3D Preview */}
            {fileIsGcode && state.file && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toolpath Preview</h4>
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">
                                {showPreview ? 'visibility_off' : 'visibility'}
                            </span>
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                    </div>
                    {showPreview && (
                        <Gcode3DViewer file={state.file} className="h-[350px]" />
                    )}
                </div>
            )}

            {/* Info Box */}
            {state.file && (
                <div className={`rounded-xl p-4 flex gap-4 ${fileIsGcode ? 'bg-violet-50 border border-violet-100' : 'bg-primary/5 border border-primary/10'}`}>
                    <span className={`material-symbols-outlined ${fileIsGcode ? 'text-violet-600' : 'text-primary'}`}>info</span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {fileIsGcode ? (
                            <>
                                <strong className="text-violet-600 uppercase tracking-tight font-bold">G-CODE File:</strong> Print settings are embedded in your file.
                                {gcodePreview?.slicer && <> Generated by <span className="font-bold text-slate-900">{gcodePreview.slicer}</span>.</>}
                                {' '}You can proceed directly to <span className="text-slate-900 font-bold">Configure</span> to set quantity.
                            </>
                        ) : (
                            <>
                                <strong className="text-primary uppercase tracking-tight font-bold">Heads up:</strong> We automatically check for manifold errors and thin wall constraints. Your file looks solid and ready for the <span className="text-slate-900 font-bold">Configure</span> step.
                            </>
                        )}
                    </p>
                </div>
            )}
        </>
    )
}
