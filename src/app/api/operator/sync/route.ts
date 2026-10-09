import { NextResponse } from 'next/server';
import { submitDocket, logFluid, reportBreakdown } from '@/actions/operator';

export async function POST(request: Request) {
  try {
    const item = await request.json();
    const { actionName, payload } = item;

    let result;
    if (actionName === 'submitDocket') {
      result = await submitDocket(payload);
    } else if (actionName === 'logFluid') {
      result = await logFluid(payload);
    } else if (actionName === 'reportBreakdown') {
      result = await reportBreakdown(payload);
    } else {
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }

    if (result && result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result?.error }, { status: 400 });
    }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
