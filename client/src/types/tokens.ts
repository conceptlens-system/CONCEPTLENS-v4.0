export interface UserTokens {
    userId: string;
    role: 'student' | 'professor' | 'admin';
    dailyLimit: number;
    used: number;
    lastResetDate: string; // ISO format: YYYY-MM-DD
    totalLifetimeUsed: number;
}

export interface TokenRequest {
    id: string;
    userId: string;
    userName: string;
    role: string;
    requestedAmount: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string; // ISO date
}
