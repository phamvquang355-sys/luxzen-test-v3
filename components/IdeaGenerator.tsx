import React, { useState, useRef } from 'react';
import { FileData, IdeaAsset, IdeaGeneratorProps } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import { ImageComparator } from './ImageComparator';
import * as geminiService from '../services/geminiService';

export const IdeaGenerator: React.FC<IdeaGeneratorProps> = ({ state, onStateChange, userCredits, onDeductCredits, onReset }) => {
  const { sourceSketch, referenceStyle, assets, isLoading, resultImage, baseImage, error, currentStep } = state;
  const [activePin, setActivePin] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("Đang xử lý...");
  const imgRef = useRef<HTMLImageElement>(null);

  // --- Handlers ---

  const handleSketchUpload = (file: FileData) => {
    onStateChange({ sourceSketch: file, assets: [], resultImage: null, baseImage: null, error: null, currentStep: 'UPLOAD' });
  };

  const handleStyleUpload = (file: FileData) => {
    onStateChange({ referenceStyle: file });
  };

  // Click handler depends on the step
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    // Only allow pinning if we have a base image (Structure Generated) OR if we are just testing on sketch (less ideal but possible)
    // For 2-pass, we strictly prefer pinning on the Base Image.
    const targetImage = baseImage || sourceSketch?.objectURL;
    
    if (!targetImage || !imgRef.current) return;
    // Don't add pins if final result is already there (unless we want to edit, but let's keep simple)
    if (resultImage) return;

    // IMPORTANT: If we are in UPLOAD step, clicking sketch does nothing (or maybe zoom). 
    // We want user to generate structure first. 
    if (currentStep === 'UPLOAD') {
        // Optional: Alert user to generate structure first? 
        // For now, let's allow pinning on sketch if they really want, but 2-pass suggests structure first.
        // Let's enforce structure generation first for the "2-Pass" experience.
        return; 
    }

    const rect = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAsset: IdeaAsset = {
      id: Date.now().toString(),
      x,
      y,
      image: null,
      label: `Vật thể ${assets.length + 1}`
    };

    onStateChange({ assets: [...assets, newAsset] });
    setActivePin(newAsset.id);
  };

  const updateAssetImage = (id: string, file: FileData) => {
    onStateChange({
      assets: assets.map(a => a.id === id ? { ...a, image: file } : a)
    });
  };

  const removeAsset = (id: string) => {
    onStateChange({ assets: assets.filter(a => a.id !== id) });
    if (activePin === id) setActivePin(null);
  };

  // --- Giai đoạn 1: Tạo Khung Sườn ---
  const handleGenerateStructure = async () => {
    const COST = 20;
    if (userCredits < COST) {
        onStateChange({ error: `Bạn cần ${COST} Credits để tạo khung sườn.` });
        return;
    }
    if (!sourceSketch) return;
    
    onStateChange({ isLoading: true, error: null });
    setLoadingStatus("Đang khởi tạo khung sườn...");

    try {
        if (onDeductCredits) await onDeductCredits(COST, "Idea Gen: Structure Pass");
        
        const structureB64 = await geminiService.generateIdeaStructure(
            sourceSketch,
            referenceStyle || null,
            (status) => setLoadingStatus(status)
        );
        
        // Convert base64 string to objectURL for display consistency if needed, 
        // but Image component handles data URI fine.
        onStateChange({ 
            baseImage: structureB64, 
            currentStep: 'STRUCTURE_GENERATED',
            isLoading: false 
        });
    } catch (e) {
        onStateChange({ error: "Lỗi khi tạo khung sườn. Thử lại.", isLoading: false });
    }
  };

  // --- Giai đoạn 2: Ghép Decor ---
  const handleGenerateDecor = async () => {
    const COST = 20;
    if (userCredits < COST) {
        onStateChange({ error: `Bạn cần ${COST} Credits để ghép decor.` });
        return;
    }
    if (!baseImage || assets.length === 0) return;

    onStateChange({ isLoading: true, error: null });
    setLoadingStatus("Đang ghép vật thể vào không gian...");

    try {
        if (onDeductCredits) await onDeductCredits(COST, "Idea Gen: Decor Pass");

        // Helper to extract base64/mime from data URI
        const splitDataURI = (uri: string) => {
            const parts = uri.split(';base64,');
            return { mimeType: parts[0].replace('data:', ''), base64: parts[1] };
        };
        const baseData = splitDataURI(baseImage);

        const finalResult = await geminiService.generateIdeaDecor(
            baseData.base64,
            baseData.mimeType,
            assets,
            (status) => setLoadingStatus(status)
        );

        onStateChange({ 
            resultImage: finalResult, 
            currentStep: 'COMPLETED',
            isLoading: false 
        });
    } catch (e) {
        onStateChange({ error: "Lỗi khi ghép decor. Thử lại.", isLoading: false });
    }
  };

  const resetAll = () => {
      onReset();
      // Reset local specific state if needed
  };

  // Determine what image to show on the main canvas
  // 1. Final Result (if done)
  // 2. Base Structure Image (if step 1 done)
  // 3. Original Sketch (if step 1 not done)
  const displayImage = resultImage || baseImage || sourceSketch?.objectURL;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-zinc-50 min-h-screen rounded-2xl">
      <div className="flex flex-col">
          <h2 className="text-3xl font-serif font-bold text-luxury-900">Idea Generator (2-Pass)</h2>
          <p className="text-luxury-500 italic">Quy trình chuyên nghiệp: Dựng khung sườn ➜ Sắp đặt nội thất</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full">
        {/* CỘT TRÁI: KHÔNG GIAN LÀM VIỆC */}
        <div className="flex-1 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 h-full min-h-[600px] flex flex-col">
            
            {/* Header Steps */}
            <div className="flex items-center gap-4 mb-4 border-b pb-4">
                <div className={`flex items-center gap-2 ${currentStep === 'UPLOAD' ? 'text-purple-600 font-bold' : 'text-zinc-400'}`}>
                    <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">1</div>
                    <span>Dựng Khung</span>
                </div>
                <div className="w-8 h-[1px] bg-zinc-300"></div>
                <div className={`flex items-center gap-2 ${currentStep === 'STRUCTURE_GENERATED' ? 'text-purple-600 font-bold' : 'text-zinc-400'}`}>
                    <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">2</div>
                    <span>Ghim Decor</span>
                </div>
                <div className="w-8 h-[1px] bg-zinc-300"></div>
                <div className={`flex items-center gap-2 ${currentStep === 'COMPLETED' ? 'text-green-600 font-bold' : 'text-zinc-400'}`}>
                    <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs">3</div>
                    <span>Hoàn Thiện</span>
                </div>
            </div>

            {/* Main Canvas */}
            <div className="flex-grow relative bg-zinc-100 rounded-xl overflow-hidden border-2 border-zinc-200" style={{ minHeight: '500px' }}>
                {!displayImage ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
                        <p>Vui lòng tải ảnh phác thảo ở cột bên phải</p>
                    </div>
                ) : (
                    <>
                        {/* Image Display */}
                         {resultImage && baseImage ? (
                             // If completed, show comparator between Base Structure vs Final Decor
                            <ImageComparator originalImage={baseImage} generatedImage={resultImage} />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center relative group">
                                <img 
                                    ref={imgRef}
                                    src={displayImage} 
                                    className={`max-w-full max-h-full object-contain ${currentStep === 'STRUCTURE_GENERATED' ? 'cursor-crosshair pointer-events-auto' : ''}`}
                                    alt="Workspace"
                                    onClick={handleImageClick}
                                />
                                {currentStep === 'STRUCTURE_GENERATED' && !isLoading && (
                                     <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg pointer-events-none">
                                        Click vào ảnh để ghim vật thể
                                    </div>
                                )}
                            </div>
                         )}

                        {/* Pins Overlay (Only show on Base Image phase) */}
                        {currentStep === 'STRUCTURE_GENERATED' && !resultImage && assets.map((asset, idx) => (
                             <div 
                                key={asset.id}
                                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 z-20`}
                                style={{ left: `${asset.x}%`, top: `${asset.y}%` }}
                                onClick={(e) => { e.stopPropagation(); setActivePin(asset.id); }}
                            >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2 border-white transition-colors ${activePin === asset.id ? 'bg-purple-600 scale-125' : (asset.image ? 'bg-green-500' : 'bg-red-500 animate-pulse')}`}>
                                    {asset.image ? (
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                    ) : (
                                        <span className="text-white text-xs font-bold">{idx + 1}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                        <Spinner />
                        <p className="mt-4 text-purple-800 font-bold animate-pulse">{loadingStatus}</p>
                    </div>
                )}
            </div>

            {/* Footer Actions for Result */}
            {resultImage && (
                <div className="flex gap-4 mt-4 justify-center">
                    <a href={resultImage} download="decor-render.png" className="px-6 py-3 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800">
                        Tải Ảnh
                    </a>
                    <button onClick={resetAll} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">
                        Tạo Mới
                    </button>
                </div>
            )}
             {error && <div className="mt-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">{error}</div>}
          </div>
        </div>

        {/* CỘT PHẢI: CÔNG CỤ & QUẢN LÝ */}
        <div className="w-full lg:w-96 space-y-6">
            
            {/* PANEL 1: INPUTS (Only show in Step 1) */}
            {currentStep === 'UPLOAD' && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 space-y-4">
                    <h3 className="font-bold text-luxury-900 border-b pb-2">1. Đầu vào (Inputs)</h3>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Ảnh Phác Thảo (Sketch)</label>
                        <ImageUpload 
                            onFileSelect={handleSketchUpload} 
                            previewUrl={sourceSketch?.objectURL || null}
                            placeholder="Tải sketch..."
                            compact
                        />
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-bold text-zinc-500 uppercase">Ảnh Style / Vật Liệu (Tùy chọn)</label>
                         <ImageUpload 
                            onFileSelect={handleStyleUpload}
                            previewUrl={referenceStyle?.objectURL || null}
                            placeholder="Tải ảnh mẫu..."
                            compact
                        />
                    </div>

                    <button 
                        onClick={handleGenerateStructure}
                        disabled={isLoading || !sourceSketch}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 mt-2"
                    >
                        TẠO KHUNG SƯỜN (20 Credits)
                    </button>
                </div>
            )}

            {/* PANEL 2: ASSETS MANAGEMENT (Show in Step 2) */}
            {currentStep === 'STRUCTURE_GENERATED' && (
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 space-y-4 h-full max-h-[calc(100vh-100px)] flex flex-col">
                    <h3 className="font-bold text-luxury-900 border-b pb-2">2. Ghim Decor ({assets.length})</h3>
                    
                    <div className="space-y-3 overflow-y-auto pr-2 flex-grow min-h-[200px]">
                        {assets.length === 0 && (
                            <div className="text-sm text-zinc-400 italic text-center py-8 border-2 border-dashed border-zinc-100 rounded-xl">
                                Click vào ảnh bên trái để thêm vị trí đặt decor.
                            </div>
                        )}
                        
                        {assets.map((asset, idx) => (
                            <div 
                                key={asset.id} 
                                className={`p-3 rounded-xl border transition-all ${activePin === asset.id ? 'border-purple-500 bg-purple-50' : 'border-zinc-100 bg-zinc-50'}`}
                                onClick={() => setActivePin(asset.id)}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-xs bg-zinc-200 w-5 h-5 flex items-center justify-center rounded-full">{idx + 1}</span>
                                    <input 
                                        className="bg-transparent text-sm font-semibold w-full ml-2 outline-none"
                                        value={asset.label}
                                        onChange={(e) => onStateChange({ assets: assets.map(a => a.id === asset.id ? {...a, label: e.target.value} : a) })}
                                        placeholder="Tên vật thể..."
                                    />
                                    <button onClick={(e) => {e.stopPropagation(); removeAsset(asset.id)}} className="text-red-400 hover:text-red-600">✕</button>
                                </div>
                                {activePin === asset.id && (
                                    <ImageUpload 
                                        onFileSelect={(f) => updateAssetImage(asset.id, f)} 
                                        previewUrl={asset.image?.objectURL || null}
                                        placeholder="Ảnh decor mẫu"
                                        compact
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleGenerateDecor}
                        disabled={isLoading || assets.length === 0}
                        className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                        RENDER HOÀN THIỆN (20 Credits)
                    </button>
                 </div>
            )}

            {/* PANEL 3: COMPLETED INFO */}
            {currentStep === 'COMPLETED' && (
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                    <h3 className="font-bold text-green-600 mb-2">🎉 Hoàn Thành!</h3>
                    <p className="text-sm text-zinc-600">Bạn đã hoàn tất quy trình thiết kế 2 bước.</p>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};