import { prisma } from "@/lib/prisma";
import { startOfDay, addDays } from "date-fns";
import { DocumentStatus } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ShieldAlert, Clock } from "lucide-react";
import { getStationaryFleetAlerts } from "@/lib/gis/stationaryAlerts";

export async function ComplianceRadar() {
  const today = startOfDay(new Date());
  const thirtyDaysFromNow = addDays(today, 30);

  // Expired Documents
  const expiredVehicles = await prisma.vehicleDocument.findMany({
    where: {
      status: DocumentStatus.ACTIVE,
      expiryDate: { lt: today }
    },
    include: { vehicle: true }
  });

  const expiredEmployees = await prisma.employeeDocument.findMany({
    where: {
      status: DocumentStatus.ACTIVE,
      expiryDate: { lt: today }
    },
    include: { employee: true }
  });

  // Expiring Soon (Next 30 Days)
  const expiringVehicles = await prisma.vehicleDocument.findMany({
    where: {
      status: DocumentStatus.ACTIVE,
      expiryDate: { gte: today, lte: thirtyDaysFromNow }
    },
    include: { vehicle: true }
  });

  const expiringEmployees = await prisma.employeeDocument.findMany({
    where: {
      status: DocumentStatus.ACTIVE,
      expiryDate: { gte: today, lte: thirtyDaysFromNow }
    },
    include: { employee: true }
  });

  // Active Fleet Movement Anomalies (Stationary En Route > 30 mins)
  const stationaryAlerts = await getStationaryFleetAlerts(30);

  const hasExpired = expiredVehicles.length > 0 || expiredEmployees.length > 0;
  const hasExpiring = expiringVehicles.length > 0 || expiringEmployees.length > 0;
  const hasStationary = stationaryAlerts.length > 0;

  if (!hasExpired && !hasExpiring && !hasStationary) {
    return (
      <Card className="bg-emerald-500/10 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <ShieldAlert className="w-5 h-5" />
            Compliance & Fleet Radar
          </CardTitle>
          <CardDescription>All fleet and employee documents are up to date and fleet movements are normal.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Compliance & Fleet Alerts
        </CardTitle>
        <CardDescription>
          Critical document expiries and fleet movement advisories requiring attention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {expiredVehicles.map(doc => (
          <Alert variant="destructive" key={doc.id}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>EXPIRED: {doc.vehicle.licensePlate} ({doc.type})</AlertTitle>
            <AlertDescription>
              Document {doc.documentNumber} expired on {doc.expiryDate.toLocaleDateString()}. Immediate action required!
            </AlertDescription>
          </Alert>
        ))}

        {expiredEmployees.map(doc => (
          <Alert variant="destructive" key={doc.id}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>EXPIRED: {doc.employee.name} ({doc.type})</AlertTitle>
            <AlertDescription>
              Document {doc.documentNumber} expired on {doc.expiryDate.toLocaleDateString()}.
            </AlertDescription>
          </Alert>
        ))}

        {stationaryAlerts.map(alert => (
          <Alert key={alert.id} className="bg-amber-50 text-amber-900 border-amber-300">
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertTitle className="flex items-center justify-between font-semibold">
              <span>STATIONARY EN ROUTE: {alert.vehiclePlate} ({alert.driverName})</span>
              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
                {alert.dwellMinutes} mins stopped
              </span>
            </AlertTitle>
            <AlertDescription className="text-xs text-amber-800 mt-1">
              {alert.message}
            </AlertDescription>
          </Alert>
        ))}

        {expiringVehicles.map(doc => (
          <Alert key={doc.id} className="bg-orange-50 text-orange-900 border-orange-200">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            <AlertTitle>EXPIRING SOON: {doc.vehicle.licensePlate} ({doc.type})</AlertTitle>
            <AlertDescription>
              Expires on {doc.expiryDate.toLocaleDateString()}
            </AlertDescription>
          </Alert>
        ))}

        {expiringEmployees.map(doc => (
          <Alert key={doc.id} className="bg-orange-50 text-orange-900 border-orange-200">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            <AlertTitle>EXPIRING SOON: {doc.employee.name} ({doc.type})</AlertTitle>
            <AlertDescription>
              Expires on {doc.expiryDate.toLocaleDateString()}
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
