import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Employee model has NO email/password — those live on User
  const user = await prisma.user.upsert({
    where: { email: 'staff@zerogroup.in' },
    update: { hashedPassword, role: 'STAFF' },
    create: {
      email: 'staff@zerogroup.in',
      hashedPassword,
      role: 'STAFF',
    }
  });

  // Ensure the linked Employee profile exists (required by serverAuth)
  await prisma.employee.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      name: 'Test Staff',
      role: 'STAFF',
    }
  });

  return NextResponse.json({ success: true, userId: user.id });
}
