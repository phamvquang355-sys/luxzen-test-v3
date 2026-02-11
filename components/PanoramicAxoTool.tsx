
import React from 'react';
import { PanoramicAxoProps, FileData } from '../types';
import { ImageUpload } from './common/ImageUpload';
import { Spinner } from './Spinner';
import * as geminiService from '../services/geminiService';

export const PanoramicAxoTool: React.FC<PanoramicAxoProps> = ({ state, onStateChange, userCredits, onDeductCredits }) => {
  const { perspectivePhotos, isLoading, resultImage, aiReasoning, error } = state;
  const COST = 25; // Chi phí cao hơn do xử lý phức tạp (tái tạo không gian)

  const handleAddPhoto = (fileData: FileData) => {
    if (perspectivePhotos.length >= 5) return alert("Tối đa 5 ảnh góc nhìn.");
    onStateChange({ perspectivePhotos: [...perspectivePhotos, fileData] });
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...perspectivePhotos];
    newPhotos.splice(index, 1);
    onStateChange({ perspectivePhotos: newPhotos });
  };

  const handleGenerate = async () => {
    // Cần ít nhất 1 ảnh, nhưng khuyến khích nhiều hơn để AI hiểu rõ không gian
    if (perspectivePhotos.length === 0) return alert("Vui lòng tải ít nhất 1 ảnh góc nhìn.");
    
    if (onDeductCredits && userCredits < COST) {
      return onStateChange({ error: `Bạn cần ${COST} credits để thực hiện tính năng này.` });
    }

    onStateChange({ isLoading: true, error: null, resultImage: null, aiReasoning: null });
    
    try {
      if (onDeductCredits) await onDeductCredits(COST, "Generate Panoramic Axonometric");

      const response = await geminiService.generatePanoramicAxonometric(perspectivePhotos);
      
      onStateChange({ 
          resultImage: response.resultImage,
          aiReasoning: response.aiReasoning
      });
    } catch (e) {
      onStateChange({ error: "Lỗi xử lý AI: " + (e as Error).message });
    } finally {
      onStateChange({ isLoading: false });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 p-6">
      {/* LEFT PANEL: INPUTS */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="bg-theme-surface rounded-2xl p-6 border border-theme-gold/20 shadow-lg">
          <h2 className="text-xl font-serif text-theme-gold mb-2">Ảnh Góc Nhìn (Perspective)</h2>
          <p className="text-sm text-theme-text-sub mb-4">
            Tải lên các góc chụp khác nhau của <b>cùng một căn phòng</b>. AI sẽ tổng hợp và tạo phối cảnh 3D từ trên cao (không điểm tụ, bỏ lớp mái để thấy toàn cảnh).
          </p>

          {/* Grid hiển thị ảnh đã upload */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {perspectivePhotos.map((photo, idx) => (
              <div key={idx} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-theme-gold/30 shadow-sm">
                <img src={photo.objectURL} alt={`Góc ${idx + 1}`} className="w-full h-full object-cover" />
                {/* Nút xóa ảnh */}
                <button 
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                >✕</button>
              </div>
            ))}
            {/* Nút thêm ảnh */}
            {perspectivePhotos.length < 5 && (
              <div className="aspect-[4/3]">
                 <ImageUpload 
                   onFileSelect={handleAddPhoto} 
                   previewUrl={null} 
                   compact
                   placeholder={perspectivePhotos.length === 0 ? "Tải ảnh góc 1" : "+ Thêm góc khác"}
                 />
              </div>
            )}
          </div>
           <p className="text-xs text-theme-text-sub italic text-right">({perspectivePhotos.length}/5 ảnh)</p>

          {/* Nút Generate */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || perspectivePhotos.length === 0}
            className={`w-full py-4 mt-4 rounded-xl font-bold text-white transition-all transform shadow-lg flex items-center justify-center gap-2
              ${isLoading || perspectivePhotos.length === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-theme-gold to-yellow-600 hover:scale-[1.02] hover:shadow-gold/30'}`}
          >
            {isLoading ? <Spinner /> : 'TẠO PHỐI CẢNH 3D'}
          </button>
          
          {error && <p className="text-red-400 text-sm mt-3 text-center bg-red-900/20 p-2 rounded-lg animate-pulse">{error}</p>}
        </div>

        {/* Khu vực hiển thị suy luận của AI */}
        {aiReasoning && (
           <div className="bg-blue-900/30 border-l-4 border-blue-400 rounded-r-xl p-4 shadow-md backdrop-blur-sm">
             <h3 className="text-blue-300 font-bold text-sm mb-1 flex items-center gap-2">
               <span>🧠</span> AI Tái tạo Không gian:
             </h3>
             <p className="text-sm text-blue-100 leading-relaxed italic">"{aiReasoning}"</p>
           </div>
        )}
      </div>

      {/* RIGHT PANEL: RESULT */}
      <div className="w-full lg:w-2/3 bg-black/50 rounded-2xl flex items-center justify-center border border-theme-gold/10 relative overflow-hidden p-4 backdrop-blur-md">
        {resultImage ? (
           // Hiển thị kết quả
           <div className="relative w-full h-full flex items-center justify-center group">
             <img src={resultImage} alt="Panoramic Axonometric Result" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]" />
             <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-md pointer-events-none">
                 45-Degree Roofless Isometric View
             </div>
           </div>
        ) : (
           // Màn hình chờ
           <div className="text-center flex flex-col items-center opacity-40 transition-all">
               <svg className="w-24 h-24 text-theme-gold mb-6 animate-pulse-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
               </svg>
               <h3 className="text-2xl font-serif text-theme-text-main mb-3">Sa Bàn Mặt Cắt 3D</h3>
               <p className="text-base text-theme-text-sub max-w-md leading-relaxed">
                 Biến các bức ảnh chụp góc thông thường thành một bản vẽ phối cảnh trục đo góc 45 độ.<br/>AI sẽ tự tạo không gian "nhà búp bê" (lược bỏ tường trước) để nhìn thấu bên trong.
               </p>
           </div>
        )}
      </div>
    </div>
  );
};
