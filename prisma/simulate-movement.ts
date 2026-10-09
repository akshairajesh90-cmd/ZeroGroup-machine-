import { prisma } from "../src/lib/prisma";

async function simulate() {
  console.log("Starting live simulation for Operator, Driver, and Staff...");
  
  // Create a staff user ping just for fun if there's a staff user
  const staff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
  
  setInterval(async () => {
    try {
      const activeDispatches = await prisma.dailyDispatch.findMany({
        where: { status: 'IN_PROGRESS' },
        include: {
          operator: true,
          crewAssignments: { include: { employee: true } },
          locationPings: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        }
      });

      for (const dispatch of activeDispatches) {
        let baseLat = 10.8505;
        let baseLng = 76.2711;

        if (dispatch.locationPings.length > 0) {
          baseLat = Number(dispatch.locationPings[0].latitude);
          baseLng = Number(dispatch.locationPings[0].longitude);
        }

        // Simulate Operator (Moves very little, they are on site)
        if (dispatch.operatorId) {
          await prisma.locationPing.create({
            data: {
              employeeId: dispatch.operatorId,
              dispatchId: dispatch.id,
              latitude: baseLat + (Math.random() - 0.5) * 0.0001,
              longitude: baseLng + (Math.random() - 0.5) * 0.0001,
              accuracy: 10,
              source: 'SIMULATED_LIVE',
              timestamp: new Date()
            }
          });
        }

        // Simulate Crew / Driver (Moves more, they might be driving the vehicle)
        for (const crew of dispatch.crewAssignments) {
          await prisma.locationPing.create({
            data: {
              employeeId: crew.employeeId!,
              dispatchId: dispatch.id,
              latitude: baseLat + (Math.random() - 0.5) * 0.0005,
              longitude: baseLng + (Math.random() - 0.5) * 0.0005,
              accuracy: 15,
              source: 'SIMULATED_LIVE',
              timestamp: new Date()
            }
          });
        }
      }

      // Simulate Staff moving somewhere completely different
      if (staff && activeDispatches.length > 0) {
        // Find employee record for this staff
        const staffEmp = await prisma.employee.findFirst({ where: { role: 'STAFF' } });
        if (staffEmp) {
           await prisma.locationPing.create({
              data: {
                employeeId: staffEmp.id,
                latitude: 10.8505 + (Math.random() - 0.5) * 0.01,
                longitude: 76.2711 + (Math.random() - 0.5) * 0.01,
                accuracy: 5,
                source: 'SIMULATED_LIVE',
                timestamp: new Date()
              }
           });
        }
      }

      console.log(`Simulated movement for Operator, Driver, and Staff at ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      console.error("Simulation error:", e);
    }
  }, 3000); 
}

simulate();
