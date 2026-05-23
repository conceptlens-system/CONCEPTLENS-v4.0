import { NextResponse } from 'next/server';
import type { UserTokens } from '@/types/tokens';

// In-memory mock for development. In production, this would be Firestore.
let mockUserTokens: Record<string, UserTokens> = {
  'default_user': {
    userId: 'default_user',
    role: 'student',
    dailyLimit: 15,
    used: 0,
    lastResetDate: new Date().toISOString().split('T')[0],
    totalLifetimeUsed: 0
  }
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    
    let tokenData = mockUserTokens[userId];
    
    if (!tokenData) {
        tokenData = {
            userId,
            role: 'student',
            dailyLimit: 15,
            used: 0,
            lastResetDate: new Date().toISOString().split('T')[0],
            totalLifetimeUsed: 0
        };
        mockUserTokens[userId] = tokenData;
    }

    const today = new Date().toISOString().split('T')[0];
    if (tokenData.lastResetDate !== today) {
        tokenData.used = 0;
        tokenData.lastResetDate = today;
    }

    return NextResponse.json(tokenData);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId = 'default_user', action, amount = 1 } = body;
        
        let tokenData = mockUserTokens[userId];
        if (!tokenData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (action === 'use') {
            if (tokenData.used + amount > tokenData.dailyLimit) {
                return NextResponse.json({ error: 'Quota exceeded' }, { status: 403 });
            }
            tokenData.used += amount;
            tokenData.totalLifetimeUsed += amount;
        } else if (action === 'topup') {
            tokenData.dailyLimit += amount;
        }

        return NextResponse.json(tokenData);
    } catch (e) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
