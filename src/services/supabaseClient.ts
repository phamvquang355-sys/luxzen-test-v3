
// MOCK Supabase Client for demonstration purposes.
// In a real application, you would initialize the actual Supabase client here.

export const supabase = {
  rpc: async (functionName: string, params: any) => {
    console.log(`[MOCK DB] Executing RPC: ${functionName}`, params);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (functionName === 'deduct_user_credits') {
      // Simulate success if amount is reasonable (e.g., < 1000)
      // In a real app, this would check the user's balance in the DB
      if (params.p_amount > 10000) {
          return { data: { success: false, message: 'Insufficient funds' }, error: null };
      }
      return { data: { success: true, new_balance: 100 - params.p_amount }, error: null };
    }

    if (functionName === 'add_user_credits') {
      return { data: { success: true }, error: null };
    }

    return { data: null, error: { message: 'Function not found' } };
  }
};
