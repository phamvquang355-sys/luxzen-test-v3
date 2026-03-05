// Định mức giá Credit cho từng tính năng của Luxzen
export const FEATURE_PRICES = {
  IDEA_GENERATOR: 15,    // Ý tưởng
  RENDER_3D: 20,         // Render 3D chất lượng cao
  SKETCH_CONVERTER: 20,  // Phác thảo
  VIEW_SYNC: 25,         // Đồng bộ View
  PANORAMA_3D: 30,       // Toàn cảnh 3D
  ADVANCED_EDIT: 15,     // Chỉnh sửa (Inpainting)
  UPSCALE: 10,           // Nâng cấp độ nét
  VIDEO_GENERATOR: 100,  // Tạo Phim Veo
} as const;

export type FeatureName = keyof typeof FEATURE_PRICES;
