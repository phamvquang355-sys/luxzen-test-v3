import { GoogleGenAI, Type } from "@google/genai";
import { FileData, RenderOptions, Resolution, EditMode, ClickPoint, SketchStyle, IdeaAsset } from "../types"; 
import { PHOTOGRAPHY_PRESETS, STRUCTURE_FIDELITY_PROMPT, REALISM_MODIFIERS } from "../constants";

const WEDDING_MATERIALS_KEYWORDS = {
  // These are now examples or fallbacks, as actual values will come from options
  florals: "high-density fresh white hydrangeas and roses, hanging wisteria, lush greenery",
  lighting: "cinematic volumetric lighting, warm amber ambient glow, professional stage spotlights, Tyndall effect"
};

/**
 * Resize and compress an image to optimize for upload speed and API cost.
 * @param file The original file from input.
 * @param maxWidth Maximum width/height (whichever is larger) to scale down to (default 1024px).
 * @param quality Compression quality from 0.1 to 1.0 (default 0.8).
 * @returns A Promise that resolves with the base64 string of the compressed JPEG image (without prefix).
 */
export const resizeAndCompressImage = (
  file: File, 
  maxWidth: number = 1024, 
  quality: number = 0.8
): Promise<{ base64: string; mimeType: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate scaling factor to maintain aspect ratio
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height *= maxWidth / width;
            width = maxWidth;
          } else {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get 2D rendering context for canvas."));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Export as base64 JPEG, removing the prefix for Gemini API inlineData
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ 
          base64: dataUrl.split(',')[1], 
          mimeType: 'image/jpeg',
          width: width,
          height: height
        }); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Creates an "AI Empowerment" prompt segment when user selects "Automatic" options.
 */
export const getEmpowermentPrompt = (selections: RenderOptions): string => {
  const autoInstructions: string[] = [];

  // 1. Nếu Category là Tự động: AI phải nhận diện hình khối để giữ nguyên công năng
  if (selections.category === 'none') {
    autoInstructions.push("- PHÂN TÍCH CẤU TRÚC GỐC: Nhận diện chính xác vị trí các vật thể hiện hữu. Tuyệt đối không thêm thắt các khối kiến trúc làm thay đổi bố cục gốc.");
  }

  // 2. Nếu Style là Tự động: AI phải đọc "ngôn ngữ" thiết kế có sẵn
  if (selections.style === 'none') {
    autoInstructions.push("- TRÍCH XUẤT PHONG CÁCH: Phân tích các đường nét kiến trúc sẵn có trong ảnh (ví dụ: phào chỉ cổ điển, nét thẳng hiện đại) để render vật liệu đồng nhất với ngôn ngữ đó.");
  }

  // 3. QUAN TRỌNG: Màu sắc bám sát gốc
  if (selections.colorPalette === 'none') {
    autoInstructions.push("- BẢO TỒN BẢNG MÀU (STRICT COLOR MATCH): Thực hiện lấy mẫu màu trực tiếp từ hình ảnh gốc. Nếu ảnh gốc có tông màu vàng kem và gỗ, bản render phải sử dụng chính xác mã màu đó. Tuyệt đối không tự ý thay đổi tone màu chủ đạo.");
  }

  // 4. QUAN TRỌNG: Vật liệu bám sát gốc
  if (selections.surfaceMaterial === 'none') {
    autoInstructions.push("- NÂNG CẤP VẬT LIỆU THỰC TẾ (MATERIAL ENHANCEMENT): Xác định vật liệu hiện có (ví dụ: sàn gạch, vải lụa, kim loại). Thay vì thay thế, hãy tập trung vào việc làm nét (upscale) vân bề mặt, thêm độ phản chiếu (reflection) và độ bóng (glossiness) dựa trên bản chất vật liệu gốc.");
  }

  // 5. QUAN TRỌNG: Vật liệu vải bám sát gốc (New)
  if (selections.textileMaterial === 'none') {
    autoInstructions.push("- TỐI ƯU VẬT LIỆU VẢI: Phân tích các loại vải hiện có (ví dụ: rèm, khăn trải bàn) và nâng cấp chúng lên chất liệu cao cấp (lụa óng ánh, nhung dày, voan mỏng) phù hợp với bối cảnh tổng thể.");
  }

  // 6. QUAN TRỌNG: Màu sắc vải bám sát gốc
  if (selections.textileMaterial !== 'none' && selections.textileColor1 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC CHÍNH VẢI: AI sẽ chọn màu sắc chính hài hòa với vật liệu vải và bảng màu tổng thể.");
  }
  if (selections.textileMaterial !== 'none' && selections.textileColor2 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC PHỤ VẢI: AI sẽ chọn màu sắc phụ hài hòa với vật liệu vải và bảng màu tổng thể, tạo điểm nhấn tinh tế.");
  }


  if (autoInstructions.length === 0) return "";

  return `
--- CHẾ ĐỘ AI TUÂN THỦ TỐI ĐA (STRICT ADHERENCE MODE) ---
Nhiệm vụ của bạn là 'Diễn họa phục hồi'. Hãy coi hình ảnh gốc là tiêu chuẩn vàng về màu sắc và vật liệu:
${autoInstructions.join('\n')}
MỤC TIÊU: Tạo ra bản render 8k siêu thực nhưng khi đặt cạnh ảnh gốc, người xem phải thấy sự đồng nhất 100% về màu sắc và linh hồn của vật liệu.
-------------------------------------------------------
  `;
};

/**
 * [MỚI] Hàm tạo chỉ thị không gian (Spatial Instructions)
 * Giúp AI hiểu vị trí và tỉ lệ vật thể dựa trên tọa độ bounding box.
 */
const generateSpatialInstructions = (assets: IdeaAsset[]): string => {
  if (!assets || assets.length === 0) return "";

  // Mapping từng vật thể thành văn bản mô tả kỹ thuật
  const assetInstructions = assets.map((asset, index) => {
    // Logic xác định độ sâu dựa trên trục Y (Giả định ảnh góc nhìn ngang tầm mắt)
    // Y cao (gần 100%) = Tiền cảnh (Gần camera)
    // Y thấp (gần 0%) = Hậu cảnh (Xa camera) hoặc trên trần
    
    let depthContext = "";
    const bottomY = asset.y + asset.height;

    if (bottomY > 85) {
      depthContext = "FOREGROUND (Tiền cảnh - Yêu cầu chi tiết cao, kích thước lớn nhất)";
    } else if (bottomY > 50) {
      depthContext = "MID-GROUND (Trung cảnh - Kích thước trung bình)";
    } else {
      depthContext = "BACKGROUND/CEILING (Hậu cảnh hoặc Trần - Kích thước nhỏ theo luật xa gần)";
    }

    // Xác định tỉ lệ khung hình để gợi ý hình dáng
    const aspectRatio = asset.width / asset.height;
    const shapeHint = aspectRatio > 1.5 ? "Horizontal spread (Dàn ngang)" : aspectRatio < 0.6 ? "Vertical tall (Dạng cột cao)" : "Balanced aspect ratio";

    return `
    --- OBJECT ${index + 1}: "${asset.label}" ---
    - BOUNDING BOX: x=${Math.round(asset.x)}%, y=${Math.round(asset.y)}%, w=${Math.round(asset.width)}%, h=${Math.round(asset.height)}%
    - SPATIAL ZONE: ${depthContext}
    - SHAPE HINT: ${shapeHint}
    - SCALE REQUIREMENT: Render this object with realistic physical proportions relative to the room height.
    ${asset.image ? "- VISUAL REFERENCE: Use the provided crop image strictly for style and structure." : ""}
    `;
  }).join('\n');

  // Trả về một khối Prompt kỹ thuật (System Instruction)
  return `
  \n========== SPATIAL & PERSPECTIVE INSTRUCTIONS (CRITICAL) ==========
  You are performing 'Perspective-Aware Photobashing'. You MUST place the following objects into the scene with perfect architectural perspective:

  ${assetInstructions}

  STRICT RULES FOR SCALING & PLACEMENT:
  1. VANISHING POINT: Align all objects to the room's primary vanishing point.
  2. CONTACT SHADOWS: All objects touching the floor MUST have realistic ambient occlusion and contact shadows to prevent the "floating" effect.
  3. RELATIVE SCALE: Compare objects to human scale equivalents. (e.g., A flower vase cannot be larger than a chair; A wedding arch must be taller than a person).
  4. OCCLUSION: Objects in the FOREGROUND must correctly obscure objects in the BACKGROUND.
  ====================================================================\n
  `;
};

/**
 * Analyzes an image with a specific instruction to generate a text prompt/description.
 * Used for auto-detecting event space features.
 */
export const generatePromptFromImageAndText = async (
  image: FileData, 
  instruction: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: instruction },
          { inlineData: { mimeType: image.mimeType, data: image.base64 } }
        ]
      },
      config: { temperature: 0.4 }
    });

    return response.text || "Không thể phân tích ảnh.";
  } catch (error) {
    console.error("Auto-Prompt Generation Error:", error);
    throw error;
  }
};

/**
 * Builds a prompt for high-quality photography render
 */
export const generateRenderPrompt = (
  basePrompt: string, 
  style: string, 
  isAutoFocus: boolean,
  presetKey: string
) => {
  const preset = PHOTOGRAPHY_PRESETS[presetKey as keyof typeof PHOTOGRAPHY_PRESETS] || PHOTOGRAPHY_PRESETS.CINEMATIC;
  
  // Logic xử lý Auto-Focus
  const focusPrompt = isAutoFocus 
    ? "AI AUTOMATIC FOCUS: Identify the most prominent decorative element and apply a sharp photographic focus to it, creating a natural depth of field."
    : "MANUAL FOCUS: Keep the sharpness consistent across the designated focal area.";

  return `
    IMAGE TYPE: Wedding Design Render.
    CORE INSTRUCTION: ${STRUCTURE_FIDELITY_PROMPT}
    
    SUBJECT DESCRIPTION: ${basePrompt}.
    VISUAL STYLE: ${style}.
    PHOTOGRAPHY SETTINGS: ${preset.prompt}.
    FOCUS CONTROL: ${focusPrompt}.
    
    QUALITY STANDARDS: ${REALISM_MODIFIERS}.
    
    FINAL NOTE: Ensure the materials like glass, silk, and flowers look authentic under the specified lighting.
  `;
};


export const generateWeddingRender = async (
  sourceImage: FileData,
  options: RenderOptions
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Get Empowerment Prompt
  const empowermentPrompt = getEmpowermentPrompt(options);

  // 1.1 Get Spatial Instructions (if assets provided)
  const spatialPrompt = options.assets ? generateSpatialInstructions(options.assets) : "";

  // STEP 1: PROMPT CONSTRUCTION (MIXED STRATEGY)
  let masterPrompt = "";

  // Construct textile material and color string
  let textileDetails = '';
  if (options.textileMaterial !== 'none') {
    textileDetails += options.textileMaterial;
    if (options.textileColor1 !== 'none' && options.textileColor2 !== 'none') {
      textileDetails += ` in a primary color of ${options.textileColor1} and a secondary color of ${options.textileColor2}`;
    } else if (options.textileColor1 !== 'none') {
      textileDetails += ` in ${options.textileColor1}`;
    } else if (options.textileColor2 !== 'none') {
      textileDetails += ` with accents of ${options.textileColor2}`;
    }
  } else {
    textileDetails = 'appropriate luxury fabrics and draping based on context';
  }

  const baseDescription = `
    Analyze this wedding sketch/3D base.
    CONTEXT: ${options.category !== 'none' ? options.category : 'wedding event space'}.
    STYLE: ${options.style !== 'none' ? options.style : 'high-end luxury wedding'}.
    PALETTE: ${options.colorPalette !== 'none' ? options.colorPalette : 'harmonious elegant palette'}.
    MATERIALS: ${options.surfaceMaterial !== 'none' ? options.surfaceMaterial : 'appropriate luxury materials based on context'} for flooring and prominent surfaces.
    TEXTILE MATERIALS: ${textileDetails}.
    FLORALS: ${WEDDING_MATERIALS_KEYWORDS.florals}.
    LIGHTING: ${WEDDING_MATERIALS_KEYWORDS.lighting}.
    USER DETAILS: ${options.additionalPrompt}.
    ${empowermentPrompt}
    ${spatialPrompt}
  `;

  if (options.hiddenAIContext) {
      console.log("Step 1: Using Mixed Prompt Strategy (Hidden Context Available)...");
      // Integrate with the advanced render prompt builder
      masterPrompt = generateRenderPrompt(
          `${baseDescription}\nCONTEXTUAL ANALYSIS FROM SOURCE: ${options.hiddenAIContext}`,
          options.style,
          options.isAutoFocus,
          options.cameraPreset
      );
  } else {
      console.log("Step 1: Analyzing structure with Gemini Flash (Fallback)...");
      const analysisPrompt = `
        ${baseDescription}
        1. Identify the exact perspective: (e.g., eye-level, wide angle).
        2. Identify structural anchors: (e.g., center aisle, stage placement, ceiling height).
        3. Generate a comprehensive description of the scene that can be used to re-render it photorealistically.
        
        Return ONLY the description.
      `;

      try {
          const reasoningResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: analysisPrompt },
                    { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
                ]
            },
            config: { temperature: 0.2 }
          });
          
          const sceneDescription = reasoningResponse.text || baseDescription;
          masterPrompt = generateRenderPrompt(
              sceneDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
          
          console.log("Master Prompt Generated:", masterPrompt);
      } catch (e) {
          console.warn("Reasoning step failed, falling back to basic prompt", e);
          masterPrompt = generateRenderPrompt(
              baseDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
      }
  }

  // STEP 2: RENDERING
  console.log("Step 2: Rendering with Gemini Pro Image...");
  try {
    const renderResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: masterPrompt },
          { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
        ]
      },
      config: {
        systemInstruction: "You are a specialized 3D Wedding Visualizer. Transform the input sketch into a photorealistic render following the prompt exactly."
      }
    });

    if (renderResponse.candidates && renderResponse.candidates.length > 0) {
        const content = renderResponse.candidates[0].content;
        
        if (content && content.parts) {
            for (const part of content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    }
    
    throw new Error("No image generated in the response.");

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

const getSupportedAspectRatio = (width: number, height: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" => {
  const ratio = width / height;

  if (ratio > 1.5) return "16:9"; // Landscape (e.g., 1.77 for 16:9)
  if (ratio > 1.0) return "4:3";  // Slightly landscape (e.g., 1.33 for 4:3)
  if (ratio < 0.6) return "9:16"; // Portrait (e.g., 0.56 for 9:16)
  if (ratio < 1.0) return "3:4";  // Slightly portrait (e.g., 0.75 for 3:4)
  return "1:1";                   // Square (default)
};

export const generateHighQualityImage = async (
  prompt: string,
  resolution: Resolution,
  sourceImage: { mimeType: string; base64: string; width?: number; height?: number } 
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contentsParts = [];
  contentsParts.push({ inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } });
  contentsParts.push({ text: prompt });

  const aspectRatio = sourceImage.width && sourceImage.height
    ? getSupportedAspectRatio(sourceImage.width, sourceImage.height)
    : "16:9";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: contentsParts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: resolution,
        },
        systemInstruction: "You are an expert image upscaler and faithful detail enhancer. Your task is to perform a hyper-realistic upscale, strictly preserving all original content, composition, color palette, and design. Focus on improving texture realism, light interaction, and overall photorealism without introducing any new elements or altering the original design. Make the image look like a professional 8K render from the provided source."
      },
    });

    const generatedImageUrls: string[] = [];
    if (response.candidates && response.candidates.length > 0) {
      for (const candidate of response.candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            }
          }
        }
      }
    }
    if (generatedImageUrls.length === 0) {
      throw new Error("No image data returned from generateHighQualityImage.");
    }
    return generatedImageUrls;

  } catch (error) {
    console.error("Gemini High Quality Image Generation Error:", error);
    throw error;
  }
};

export const generateAdvancedEdit = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  editMode: EditMode,
  secondaryImageData?: { base64: string; mimeType: string }, 
  targetClickPoints?: ClickPoint[], 
  additionalPrompt?: string 
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } }
  ];
  let systemInstruction = "";
  let userPrompt = "";

  if (editMode === 'NOTE') {
    if (!secondaryImageData) throw new Error("Annotated image data is required for 'NOTE' mode.");
    
    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    
    const userInstructionText = additionalPrompt ? `USER INSTRUCTIONS: ${additionalPrompt}` : "Follow the visual annotations.";

    userPrompt = `
      TASK: PHOTOREALISTIC IMAGE EDITING BASED ON VISUAL ANNOTATIONS.
      INPUT: First image is the original scene. Second image contains visual annotations (red brush strokes, arrows, text).
      
      ${userInstructionText}
      
      RULES:
      1. CAREFULLY INTERPRET ALL ANNOTATIONS: Understand the meaning of red brush strokes (areas to modify/fill), arrows (pointing to specific elements/regons), and text (explicit instructions).
      2. EXECUTE MODIFICATIONS FAITHFULLY: Based on the annotations AND the user instructions, make the requested changes in a photorealistic manner.
         - For areas marked with red brush strokes: Modify/fill these areas with lush, high-density white flowers (roses, hydrangeas) and shimmering white silk draping, blending seamlessly, unless instructed otherwise.
         - For arrows and text: Interpret these as specific instructions for the elements they indicate.
      3. PRESERVE UNMARKED AREAS: Strictly preserve the original lighting, shadows, perspective, and all structural elements outside the annotated regions EXACTLY. Do NOT alter unmarked areas.
      4. Output Style: High-resolution, hyper-realistic 8k render, professional wedding aesthetic.
      
      DO NOT introduce new objects or change the scene's composition beyond the explicit instructions.
    `;
    systemInstruction = "You are an AI image editor specializing in wedding decor. You are highly skilled in interpreting visual annotations (brush strokes, arrows, text) on images to make precise and photorealistic modifications. Always prioritize faithful interpretation and seamless integration.";

  } else if (editMode === 'SWAP') {
    if (!secondaryImageData || !targetClickPoints || targetClickPoints.length === 0) {
      throw new Error("Reference object image and target click points are required for 'SWAP' mode.");
    }

    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    
    const clickPointsDescription = targetClickPoints.map(p => `(X:${p.x}%, Y:${p.y}%)`).join(', ');

    userPrompt = `
      TASK: PHOTOREALISTIC OBJECT REPLACEMENT (SWAP MODE).
      INPUT: First image is the original scene. Second image is a reference object to be inserted.
      
      RULES:
      1. Identify the object(s) at approximately the following coordinates in the original image: ${clickPointsDescription}.
      2. Replace these identified object(s) with the exact item shown in the reference image.
      3. Match the perspective, scale, lighting, and shadows of the new object(s) to seamlessly integrate them into the scene.
      4. Ensure the replacement looks natural and photorealistic.
      5. Output: High-resolution, photorealistic wedding aesthetic.
      
      DO NOT alter other parts of the image. DO NOT introduce new elements or change the scene's composition except for the specified object replacement.
    `;
    systemInstruction = "You are an AI specializing in precise object replacement in wedding visuals. Integrate the reference object exactly at the specified location.";
  }

  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: parts }, 
      config: {
        systemInstruction: systemInstruction
      }
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    throw new Error("No image generated in the response for Advanced Edit.");

  } catch (error) {
    console.error("Gemini Advanced Edit Image Generation Error:", error);
    throw error;
  }
};

export const detectSimilarObjects = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  detectionPrompt: string,
): Promise<ClickPoint[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } },
          { text: detectionPrompt }
        ]
      },
      config: {
        responseMimeType: "application/json", 
        responseSchema: { 
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER, description: "X coordinate as percentage from left (0-100)." },
              y: { type: Type.NUMBER, description: "Y coordinate as percentage from top (0-100)." }
            },
            required: ["x", "y"]
          }
        },
        systemInstruction: "You are an expert object detection AI. Identify and return the precise percentage coordinates (x, y) of all similar objects found in the image, strictly in JSON array format."
      }
    });

    const jsonStr = response.text?.trim();
    if (!jsonStr) {
      throw new Error("No JSON response received for object detection.");
    }

    try {
      const detectedPoints: ClickPoint[] = JSON.parse(jsonStr);
      if (!Array.isArray(detectedPoints) || detectedPoints.some(p => typeof p.x !== 'number' || typeof p.y !== 'number')) {
        throw new Error("Invalid JSON format for detected points.");
      }
      return detectedPoints;
    } catch (parseError) {
      console.error("Error parsing detected objects JSON:", parseError);
      throw new Error("Failed to parse AI response for detected objects.");
    }

  } catch (error) {
    console.error("Gemini Object Detection Error:", error);
    throw error;
  }
};

export const generateSketch = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  style: SketchStyle,
  resolution: Resolution
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use the Flash image model for efficiency
  const modelName = 'gemini-2.5-flash-image';
  
  const finalPrompt = `Professional high-speed ${style} sketch conversion of a wedding event interior. Clean architectural lines, artistic shading, high contrast, white background.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } },
          { text: finalPrompt }
        ]
      },
    });

    if (response.candidates && response.candidates.length > 0) {
        const content = response.candidates[0].content;
        if (content && content.parts) {
            for (const part of content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    }
    throw new Error("No sketch/render generated in the response.");
  } catch (error) {
    console.error("Gemini Sketch Generation Error:", error);
    throw error;
  }
};

/**
 * --- GIAI ĐOẠN 1: Dựng Khung Sườn (Pass 1 - Structure) ---
 */
export const generateIdeaStructure = async (
  sketchImage: FileData,
  referenceStyle: FileData | null,
  onStatusUpdate?: (status: string) => void
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (onStatusUpdate) onStatusUpdate("Đang xây dựng khung sườn kiến trúc 3D...");

  const structurePrompt = `
    ROLE: Professional Event Constructor & 3D Visualizer.
    TASK: Convert this SKETCH (Input 1) into a photorealistic architectural base (Empty Room) following strict stage design rules.
    
    CRITICAL INSTRUCTIONS FOR STAGE 1 (STRUCTURE & COMPOSITION):
      
    1. CAMERA ANGLE (GÓC MÁY):
    - TYPE: **Dead-center Frontal Shot** (Góc chụp chính diện tuyệt đối).
    - PERSPECTIVE: **Elevation View** (Mặt đứng). The camera must be placed exactly on the center axis facing the stage flatly. No Dutch angles, no side angles.
    - SYMMETRY: Ensure perfect symmetry if the sketch implies it.

    2. COMPOSITION & PROPORTIONS (BỐ CỤC):
    - HORIZONTAL FILL: The stage design must occupy **85% of the image width**. Minimal negative space on sides (hoành tráng).
    - VERTICAL LAYOUT (STRICT):
      * **Bottom 20%**: Glossy Black Floor (Sàn đen bóng).
      * **Middle 70%**: The main Stage Structure (Frame, Walls, Decor foundations).
      * **Top 10%**: Ceiling/Background void (Starry curtain).
    
    3. MANDATORY ENVIRONMENT:
    - FLOOR: High-gloss black reflection floor.
    - BACKGROUND: Black velvet curtains with LED starlight effect.
    
    4. MATERIAL APPLICATION:
    - Apply the user's requested style (from Reference Image if provided) ONLY to the structural elements (arches, walls, catwalk) defined in the sketch.

    5. NEGATIVE INSTRUCTIONS:
    - Do NOT crop the sketch edges.
    - Do NOT add random furniture/props yet (wait for Phase 2).
    
    Output: Photorealistic 8k render of the architectural base.
  `;

  const parts: any[] = [
    { text: structurePrompt },
    { inlineData: { mimeType: sketchImage.mimeType, data: sketchImage.base64 } }
  ];

  if (referenceStyle) {
    parts.push({ inlineData: { mimeType: referenceStyle.mimeType, data: referenceStyle.base64 } });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using Flash as requested/safe choice
      contents: { parts: parts },
      config: {
        systemInstruction: "You are a specialized 3D Architectural Visualizer. Your goal is to create a realistic 'blank canvas' room based on a sketch."
      }
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    throw new Error("No structure image generated.");
  } catch (error) {
    console.error("Gemini Idea Structure Error:", error);
    throw error;
  }
};

/**
 * --- GIAI ĐOẠN 2: Sắp Đặt Decor (Pass 2 - Decoration) ---
 */
export const generateIdeaDecor = async (
  baseImageBase64: string, // Base image from Pass 1
  baseImageMimeType: string,
  assets: IdeaAsset[],
  onStatusUpdate?: (status: string) => void
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (onStatusUpdate) onStatusUpdate("Đang phân tích và sắp đặt vật thể...");

  // Generate enhanced spatial instructions using the helper
  const spatialInstructions = generateSpatialInstructions(assets);

  const decorPrompt = `
    ROLE: Professional Wedding Decorator.
    TASK: Composite specific decorative items into the provided BACKGROUND (Input 1).
    
    BACKGROUND: The first image is the architectural base. Keep its lighting and perspective exactly as is.
    
    SPATIAL & PERSPECTIVE INSTRUCTIONS:
    ${spatialInstructions}
    
    INSTRUCTIONS:
    1. Place the assets at the specified regions defined in the spatial instructions.
    2. BLENDING: Ensure the inserted objects cast realistic shadows on the floor/walls of the background. Match the color temperature and lighting direction of the background.
    3. SCALE: Scale the objects appropriately for the perspective at that depth and within the defined region.
    4. If an asset image is provided (subsequent inputs), use that exact design. If no image is provided for a label, generate a high-quality object matching the label description.
    
    Output: Final photorealistic event render.
  `;

  const parts: any[] = [
    { text: decorPrompt },
    { inlineData: { mimeType: baseImageMimeType, data: baseImageBase64 } } // Background
  ];

  // Add asset images to the context
  assets.forEach((asset, index) => {
    if (asset.image) {
      parts.push({ 
        inlineData: { mimeType: asset.image.mimeType, data: asset.image.base64 } 
      });
      // Add a text marker to link this image to the instruction if needed, 
      // though simple ordering or context usually suffices for Gemini 1.5+.
      parts.push({ text: `[Reference Image for Asset #${index + 1}]` });
    }
  });

  if (onStatusUpdate) onStatusUpdate("Đang hoàn thiện bản phối cảnh cuối cùng...");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Stick to same model for consistency
      contents: { parts: parts },
      config: {
        systemInstruction: "You are an expert Image Compositor and Decorator. Seamlessly blend objects into a scene."
      }
    });

    if (response.candidates && response.candidates.length > 0) {
      const content = response.candidates[0].content;
      if (content && content.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
    }
    throw new Error("No decor image generated.");
  } catch (error) {
    console.error("Gemini Idea Decor Error:", error);
    throw error;
  }
};

/**
 * TÍNH NĂNG MỚI: Quy trình tạo ý tưởng liền mạch (One-Pass)
 * Tự động chạy: Sketch -> Structure (Ngầm) -> Final Result
 */
export const generateSeamlessIdea = async (
  sketchImageBase64: string,
  sketchImageMimeType: string,
  styleImage: FileData | null,
  styleDescription: string,
  assets: IdeaAsset[],
  onStatusUpdate?: (status: string) => void
): Promise<{ structure: string; final: string }> => {
  try {
    // BƯỚC 1 (Chạy ngầm): Tạo khung sườn kiến trúc từ Sketch
    if (onStatusUpdate) onStatusUpdate("Step 1: Generating Structure internally...");
    console.log("Step 1: Generating Structure internally...");
    
    // Construct FileData for internal usage
    const sketchFileData: FileData = {
        base64: sketchImageBase64,
        mimeType: sketchImageMimeType
    };

    // Gọi lại hàm tạo structure có sẵn, prompt tập trung vào kiến trúc thô
    const structureImage = await generateIdeaStructure(
      sketchFileData,
      styleImage, // Pass style image here if available for structure
      onStatusUpdate
    );

    // Helper to extract base64/mime from data URI
    const splitDataURI = (uri: string) => {
        const parts = uri.split(';base64,');
        return { mimeType: parts[0].replace('data:', ''), base64: parts[1] };
    };
    const structureData = splitDataURI(structureImage);

    // BƯỚC 2: Ghép Decor vào khung sườn vừa tạo
    if (onStatusUpdate) onStatusUpdate("Step 2: Applying Decor based on Sketch pins...");
    console.log("Step 2: Applying Decor based on Sketch pins...");
    
    // Gọi hàm tạo ảnh cuối cùng (Tái sử dụng hàm generateIdeaDecor)
    const finalImage = await generateIdeaDecor(
        structureData.base64,
        structureData.mimeType,
        assets,
        onStatusUpdate
    );

    return { structure: structureImage, final: finalImage };
  } catch (error) {
    console.error("Seamless generation failed:", error);
    throw error;
  }
};