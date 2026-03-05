import { FEATURE_PRICES, FeatureName } from '../constants/pricing';

// Event name for credit updates
export const CREDIT_UPDATE_EVENT = 'credit_updated';

// Mock database using localStorage
const STORAGE_KEY = 'luxzen_user_credits';
const DEFAULT_CREDITS = 100;

// Helper to get current credits
export const getCurrentCredits = (): number => {
  if (typeof window === 'undefined') return DEFAULT_CREDITS;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? parseInt(stored, 10) : DEFAULT_CREDITS;
};

// Helper to set credits and dispatch event
const setCredits = (amount: number) => {
  localStorage.setItem(STORAGE_KEY, amount.toString());
  window.dispatchEvent(new CustomEvent(CREDIT_UPDATE_EVENT, { detail: amount }));
};

/**
 * Hàm gọi API trừ Credit trong Database (Mocked with localStorage)
 */
const deductCredits = async (userId: string, amount: number): Promise<boolean> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const current = getCurrentCredits();
  if (current >= amount) {
    setCredits(current - amount);
    return true;
  }
  return false;
};

/**
 * Hàm gọi API hoàn lại Credit khi lỗi (Mocked with localStorage)
 */
const refundCredits = async (userId: string, amount: number, reason: string): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const current = getCurrentCredits();
  setCredits(current + amount);
  console.log(`Đã hoàn lại ${amount} credits cho user ${userId}. Lý do: ${reason}`);
};

/**
 * HÀM CỐT LÕI: Bao bọc mọi tác vụ AI với luồng Trừ -> Chạy -> Hoàn tiền (Nếu lỗi)
 */
export const executeWithCredit = async <T>(
  userId: string,
  feature: FeatureName,
  quantity: number = 1,
  aiTask: () => Promise<T>
): Promise<T> => {
  // 1. Tính toán tổng chi phí
  const unitPrice = FEATURE_PRICES[feature];
  const totalCost = unitPrice * quantity;

  // 2. Trừ Credit trước khi chạy
  const hasEnoughCredits = await deductCredits(userId, totalCost);
  if (!hasEnoughCredits) {
    throw new Error('INSUFFICIENT_CREDITS'); // Bắn lỗi thiếu tiền để UI hiện Modal Nạp thêm
  }

  // 3. Thực thi tác vụ AI
  try {
    console.log(`Đang chạy tính năng ${feature} x ${quantity}. Đã tạm trừ ${totalCost} credits.`);
    
    // Gọi hàm tạo ảnh/video thực tế
    const result = await aiTask(); 
    
    // Thành công -> Trả về kết quả
    return result;

  } catch (error: any) {
    // 4. NẾU LỖI: Hoàn tiền ngay lập tức
    console.error(`Lỗi thực thi ${feature}. Đang tiến hành hoàn tiền...`, error);
    await refundCredits(userId, totalCost, `Lỗi server khi chạy ${feature}`);
    
    // Ném lỗi ngược lại cho UI hiển thị
    throw new Error(error.message || 'Hệ thống AI đang bận. Đã hoàn lại toàn bộ Credit.');
  }
};
