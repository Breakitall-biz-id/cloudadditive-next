"use client"

import { useCallback, useEffect, useState } from "react"
import { useDropzone } from "react-dropzone"
import type { UseOrderWizardReturn } from "@/hooks/useOrderWizard"
import { isGcodeFile, parseGcodeFile, formatPrintTime, type GcodeStats } from "@/lib/gcode-parser"

interface StepUploadProps {
    wizard: UseOrderWizardReturn
}

export function StepUpload({ wizard }: StepUploadProps) {
    const { state, actions } = wizard
    const [gcodePreview, setGcodePreview] = useState<GcodeStats | null>(null)
    const [isParsing, setIsParsing] = useState(false)

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

