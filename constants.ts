
import { OptionItem, ViewOption } from './types';

export const WEDDING_CATEGORIES: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI tự phân tích ảnh để xác định hạng mục (Sân khấu, Cổng chào, v.v.)' },
  { value: 'Wedding Main Stage', label: 'Sân Khấu Chính', description: 'Màn hình LED, phông nền hoa, bục phát biểu' },
  { value: 'Wedding Entrance Gate', label: 'Cổng Chào', description: 'Cấu trúc chào mừng, vòm hoa' },
  { value: 'Wedding Photobooth', label: 'Backdrop', description: 'Phông nền theo chủ đề cho khách chụp ảnh' },
  { value: 'Wedding Ceremony Aisle', label: 'Lối Đi Lễ Đường', description: 'Đường dẫn, trụ hoa, hiệu ứng phản chiếu' },
  { value: 'Wedding Gallery Table', label: 'Bàn Lễ Tân', description: 'Vật phẩm trang trí, khung ảnh, hoa tươi' },
  { value: 'Guest Table Setup', label: 'Bàn Tiệc Khách', description: 'Trang trí trung tâm, bộ dao dĩa, bố cục' },
];

export const WEDDING_STYLES: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI dựa trên kiến trúc sảnh tiệc để chọn phong cách thẩm mỹ nhất' },
  { value: 'Dreamy Floral', label: 'Mộng Mơ & Hoa Lá', description: 'Hoa lá phong phú, mềm mại, lãng mạn, cảm giác khu vườn' },
  { value: 'Royal Luxury', label: 'Hoàng Gia & Sang Trọng', description: 'Điểm nhấn vàng, đèn chùm, nhung, quy mô lớn' },
  { value: 'Rustic Vintage', label: 'Mộc Mạc & Cổ Điển', description: 'Chất liệu gỗ, ánh sáng ấm, hoa khô, ấm cúng' },
  { value: 'Celestial Galaxy', label: 'Thiên Hà Huyền Ảo', description: 'Bầu trời sao, tông xanh đậm, ánh sáng lung linh, huyền ảo' },
  { value: 'Indochine', label: 'Phong Cách Đông Dương', description: 'Họa tiết truyền thống, mây tre đan, cây xanh nhiệt đới, thanh lịch' },
  { value: 'Minimalist Elegant', label: 'Tối Giản & Tinh Tế', description: 'Đường nét gọn gàng, không gian trắng, tinh tế' },
];

export const COLOR_PALETTES: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'Để AI tự phối màu hài hòa với ánh sáng bối cảnh' },
  { value: 'White & Greenery', label: 'Trắng & Xanh Lá (Vĩnh cửu)' },
  { value: 'Gold & White', label: 'Vàng & Trắng (Sang trọng cổ điển)' },
  { value: 'Pastel Pink & Blue', label: 'Hồng Pastel & Xanh Lam (Mềm mại lãng mạn)' },
  { value: 'Burgundy & Gold', label: 'Đỏ Burgundy & Vàng (Sâu lắng & Đam mê)' },
  { value: 'Deep Navy & Silver', label: 'Xanh Navy Đậm & Bạc (Hiện đại & Thanh lịch)' },
  { value: 'Lavender & Grey', label: 'Tím Lavender & Xám (Mộng mơ)' },
];

export const SURFACE_MATERIALS: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI chọn vật liệu sàn/tường phù hợp với phong cách tổng thể' },
  { value: 'Polished white marble flooring', label: 'Sàn Đá Cẩm Thạch Trắng Bóng', description: 'Bề mặt phản chiếu, sang trọng' },
  { value: 'High-gloss mirror flooring', label: 'Sàn Gương Đen Bóng Cao Cấp', description: 'Tạo hiệu ứng không gian rộng và phản chiếu' },
  { value: 'Dark wooden stage', label: 'Sân Khấu Gỗ Tối Màu', description: 'Mang lại vẻ ấm cúng, cổ điển' },
  { value: 'Rough concrete walls', label: 'Tường Bê Tông Thô', description: 'Phong cách công nghiệp, hiện đại' },
  { value: 'White stucco walls', label: 'Tường Vữa Trắng', description: 'Tối giản, tinh tế' },
];

export const TEXTILE_MATERIALS: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI sẽ lựa chọn vật liệu vải phù hợp với phong cách và hạng mục.' },
  { value: 'Shimmering white silk draping', label: 'Lụa Óng Ánh', description: 'Vải lụa mềm mại, có độ bóng tự nhiên, tạo cảm giác sang trọng.' },
  { value: 'Heavy velvet upholstery', label: 'Nhung Dày Cao Cấp', description: 'Vải nhung dày, tạo vẻ ấm cúng, cổ điển và xa hoa.' },
  { value: 'Sheer chiffon curtains', label: 'Voan Mỏng Bay Bổng', description: 'Vải voan mỏng, nhẹ nhàng, tạo hiệu ứng mềm mại, lãng mạn.' },
  { value: 'Linen table runners', label: 'Vải Linen Tự Nhiên', description: 'Chất liệu linen mộc mạc, phù hợp với phong cách vintage hoặc rustic.' },
  { value: 'Crystal beaded curtains', label: 'Rèm Hạt Pha Lê', description: 'Rèm trang trí bằng các chuỗi hạt pha lê, tạo hiệu ứng lấp lánh và sang trọng.' },
];

export const TEXTILE_COLORS: OptionItem[] = [
  { value: 'none', label: 'Tự động (AI đề xuất)', description: 'AI sẽ chọn màu sắc hài hòa với bảng màu tổng thể.' },
  { value: 'White', label: 'Trắng tinh khôi' },
  { value: 'Ivory', label: 'Trắng ngà (Ivory)' },
  { value: 'Gold', label: 'Vàng đồng' },
  { value: 'Rose Gold', label: 'Vàng hồng' },
  { value: 'Silver', label: 'Bạc' },
  { value: 'Champagne', label: 'Vàng Champagne' },
  { value: 'Blush Pink', label: 'Hồng phấn (Blush Pink)' },
  { value: 'Light Blue', label: 'Xanh lam nhạt' },
  { value: 'Sage Green', label: 'Xanh lá cây nhạt (Sage Green)' },
  { value: 'Burgundy', label: 'Đỏ Burgundy' },
  { value: 'Navy Blue', label: 'Xanh Navy' },
];

export const SKETCH_STYLES: OptionItem[] = [
  { value: 'none', label: 'Tự động nhận diện', description: 'Tự động phân tích ảnh là vẽ chì, 3D thô hay ảnh chụp thật' },
  { value: 'pencil', label: 'Bút Chì (Cổ điển)', description: 'Nét vẽ chì than đen trắng, chi tiết' },
  { value: 'architectural', label: 'Kiến trúc (Line Art)', description: 'Nét mảnh, chính xác, phong cách kỹ thuật' },
  { value: 'charcoal', label: 'Than Củi (Nghệ thuật)', description: 'Đậm đà, tương phản cao, phóng khoáng' },
  { value: 'watercolor', label: 'Màu Nước (Sáng tạo)', description: 'Màu sắc nhẹ nhàng, loang màu nghệ thuật' },
];

export const SAMPLE_IMAGE_URL = "https://picsum.photos/800/600";

// --- Cấu hình Tham số Nhiếp ảnh ---
export const PHOTOGRAPHY_PRESETS = {
  CINEMATIC: {
    label: "Cinematic (Sâu & Nghệ thuật)",
    prompt: "shot on 35mm lens, f/2.8, cinematic lighting, volumetric fog, high dynamic range",
    description: "Phù hợp cho toàn cảnh sân khấu"
  },
  MACRO_DETAIL: {
    label: "Macro Detail (Cận cảnh chi tiết)",
    prompt: "shot on 85mm prime lens, f/1.8, creamy bokeh, extreme close-up, sharp textures",
    description: "Phù hợp cho hoa cầm tay, nhẫn, hoặc chi tiết bàn gallery"
  },
  NATURAL_LIGHT: {
    label: "Outdoor Natural (Ánh sáng tự nhiên)",
    prompt: "golden hour lighting, soft shadows, airy atmosphere, f/4.0",
    description: "Phù hợp cho tiệc cưới ngoài trời"
  }
};

// Ràng buộc quan trọng để giữ nguyên bố cục
export const STRUCTURE_FIDELITY_PROMPT = 
  "STRICTLY MAINTAIN the original layout, object positions, and camera angle. DO NOT add, move, or remove any structural elements. Focus ONLY on enhancing textures, materials, and realistic lighting.";

export const REALISM_MODIFIERS = 
  "photorealistic, 8k resolution, ray-tracing, unreal engine 5 style, highly detailed silk and floral textures, professional color grading, shot on Sony A7R IV";

export const VIEW_ANGLES: ViewOption[] = [
  {
    id: 'eye-level',
    label: 'Ngang tầm mắt (Eye-Level)',
    description: 'Góc nhìn thực tế của khách mời khi bước vào sảnh.',
    prompt_suffix: "eye-level perspective, human view at 1.6m height, realistic photography, architectural visualization, depth of field, wide aperture",
    strength: 0.6
  },
  {
    id: 'aisle-view',
    label: 'Dọc lối đi (Aisle View)',
    description: 'Góc nhìn từ cuối đường dẫn lên sân khấu (dành cho Lễ cưới).',
    prompt_suffix: "symmetrical view from the aisle looking towards the stage, leading lines, wedding photography composition, focus on the center stage",
    strength: 0.7
  },
  {
    id: 'top-down',
    label: 'Mặt bằng bố trí (Top-Down)',
    description: 'Góc nhìn từ trần xuống để kiểm tra layout bàn ghế.',
    prompt_suffix: "direct top-down view, orthographic plan view, architectural floor plan, layout arrangement, flat lay, high angle looking straight down",
    strength: 0.85
  },
  {
    id: 'bird-eye',
    label: 'Góc chim bay (Bird-eye)',
    description: 'Góc nhìn tổng thể 3/4 từ trên cao xuống.',
    prompt_suffix: "isometric view, bird's eye view, high angle shot, overview of the entire event hall, 3d render style, volumetric lighting",
    strength: 0.75
  },
  {
    id: 'stage-close',
    label: 'Cận cảnh sân khấu',
    description: 'Tập trung vào chi tiết trang trí backdrop sân khấu.',
    prompt_suffix: "close-up shot of the main stage, detailed backdrop decoration, floral arrangements focus, bokeh background, cinematic lighting",
    strength: 0.55
  }
];
