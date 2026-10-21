import { NextResponse } from 'next/server';
import { seedEssentialUsers } from '@/lib/seed-users';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results = await seedEssentialUsers();
    return NextResponse.json({
      success: true,
      message: `Successfully provisioned ${results.length} accounts!`,
      accounts: results,
    });
  } catch (error: any) {
    console.error("❌ Failed to seed users via API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to seed users" },
      { status: 500 }
    );
  }
}
