import { prisma } from "@/lib/prisma";

export async function getOutstandingBalances() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      invoices: {
        select: { totalAmount: true }
      },
      PaymentReceipt: {
        select: { amount: true }
      }
    }
  });

  // Calculate True A/R per customer
  const arReport = customers.map(c => {
    const totalBilled = c.invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);
    const totalPaid = c.PaymentReceipt.reduce((acc, rcpt) => acc + Number(rcpt.amount), 0);
    const outstandingBalance = totalBilled - totalPaid;

    return {
      customerId: c.id,
      name: c.name,
      totalBilled,
      totalPaid,
      outstandingBalance
    };
  });

  // Sort by highest outstanding balance first
  return arReport
    .filter(c => c.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);
}
