// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PrismaClient, WorkType, DispatchStatus, MachineType } from '@prisma/client';
import "dotenv/config";
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Seeding upcoming jobs for the next 30 days (up to 07/09/2026)...');

  // Get operators to assign jobs
  const ramesh = await prisma.employee.findFirst({ where: { name: 'Ramesh (Mixer)' } });
  const suresh = await prisma.employee.findFirst({ where: { name: 'Suresh (Lift)' } });
  
  if (!ramesh) {
    throw new Error("Operators not found. Make sure to run seed-operators first.");
  }

  // Get or create a customer
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'BuildWell Constructions',
        phone: '+919876543210',
        address: '123 Test Street'
      }
    });
  }

  // Get some machines
  let mixer = await prisma.machine.findFirst({ where: { type: MachineType.MIXER } });
  let lift = await prisma.machine.findFirst({ where: { type: MachineType.LIFT } });

  if (!mixer) {
    mixer = await prisma.machine.create({ data: { machineId: 'MIX-001', type: MachineType.MIXER, operatorDailyPayout: 800 } });
  }
  if (!lift) {
    lift = await prisma.machine.create({ data: { machineId: 'LIFT-001', type: MachineType.LIFT, operatorDailyPayout: 900 } });
  }

  const locations = [
    { name: "Kozhikode - City Center", lat: 11.2588, lng: 75.7804 },
    { name: "Kannur - Thalassery Road", lat: 11.8745, lng: 75.3704 },
    { name: "Payyanur - Station Road", lat: 12.1021, lng: 75.2023 },
    { name: "Vadakara - Beach", lat: 11.6016, lng: 75.5920 },
    { name: "Thaliparamba - Highway", lat: 12.0315, lng: 75.3626 },
    { name: "Cheruvathur", lat: 12.2139, lng: 75.1485 },
    { name: "Nileshwaram", lat: 12.2536, lng: 75.1189 }
  ];

  // Seed for the next 30 days starting from today (Aug 8, 2026)
  const startDate = new Date('2026-08-08');
  const endDate = new Date('2026-09-07');
  
  let locIndex = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const loc = locations[locIndex % locations.length];
    
    // Create one job for Ramesh and one for Suresh each day
    
    // Ramesh's Job (Mixer)
    await prisma.dailyDispatch.upsert({
      where: {
        dateOfService_customerId_siteBundleId: {
          dateOfService: new Date(d),
          customerId: customer.id,
          siteBundleId: `bundle-ramesh-${d.getTime()}`
        }
      },
      update: {},
      create: {
        customerId: customer.id,
        operatorId: ramesh.id,
        machineId: mixer.id,
        location: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        dateOfService: new Date(d),
        workType: WorkType.NORMAL,
        status: DispatchStatus.PENDING,
        siteBundleId: `bundle-ramesh-${d.getTime()}`
      }
    });

    // Suresh's Job (Lift)
    await prisma.dailyDispatch.upsert({
      where: {
        dateOfService_customerId_siteBundleId: {
          dateOfService: new Date(d),
          customerId: customer.id,
          siteBundleId: `bundle-suresh-${d.getTime()}`
        }
      },
      update: {},
      create: {
        customerId: customer.id,
        operatorId: suresh?.id || ramesh.id,
        machineId: lift.id,
        location: locations[(locIndex + 1) % locations.length].name,
        latitude: locations[(locIndex + 1) % locations.length].lat,
        longitude: locations[(locIndex + 1) % locations.length].lng,
        dateOfService: new Date(d),
        workType: WorkType.NORMAL,
        status: DispatchStatus.PENDING,
        siteBundleId: `bundle-suresh-${d.getTime()}`
      }
    });
    
    locIndex++;
  }

  console.log('Successfully seeded jobs from July 27 to August 3, 2026.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
