import { prisma } from '../src/lib/prisma';

async function main() {
  const d = await prisma.dailyDispatch.findFirst();
  const m = await prisma.machine.findFirst();
  const v = await prisma.vehicle.findFirst();
  const c = await prisma.customer.findFirst();
  const e = await prisma.employee.findFirst({ where: { role: 'OPERATOR' } });
  const inv = await prisma.invoice.findFirst();

  console.log('SAMPLE_IDS_JSON:' + JSON.stringify({
    dispatchId: d ? d.id : 'dispatch-1',
    machineId: m ? m.id : 'machine-1',
    vehicleId: v ? v.id : 'vehicle-1',
    customerId: c ? c.id : 'customer-1',
    operatorId: e ? e.id : 'operator-1',
    invoiceId: inv ? inv.id : 'invoice-1'
  }));
}

main().catch(console.error).finally(() => prisma.$disconnect());
