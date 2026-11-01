import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(__dirname, "../src");
const APP_DIR = path.resolve(SRC_DIR, "app");

export interface RouteInfo {
  route: string;
  module: "Dispatch" | "Fleet" | "Billing" | "Admin" | "Driver" | "Operator" | "Shared";
  pageFile: string;
  clientComponents: string[];
  modals: string[];
  buttons: number;
  inputs: number;
  selects: number;
}

export interface ModalInfo {
  name: string;
  type: "Standalone Component" | "Inline Dialog" | "Radix UI Primitive" | "Dead Code Component";
  file: string;
  currentZIndex: string;
  targetZIndex: string;
  module: string;
  associatedRoutes: string[];
}

function resolveImportPath(importStr: string, currentFileDir: string): string | null {
  let targetPath = "";
  if (importStr.startsWith("@/")) {
    targetPath = path.resolve(SRC_DIR, importStr.slice(2));
  } else if (importStr.startsWith(".")) {
    targetPath = path.resolve(currentFileDir, importStr);
  } else {
    return null; // External package
  }

  const extensions = [".tsx", ".ts", ".jsx", ".js"];
  for (const ext of extensions) {
    if (fs.existsSync(targetPath + ext)) {
      return targetPath + ext;
    }
  }
  for (const ext of extensions) {
    const indexPath = path.join(targetPath, "index" + ext);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return targetPath;
  }
  return null;
}

function parseFileImportsAndElements(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const isClient = content.includes('"use client"') || content.includes("'use client'");

  const buttonMatches = content.match(/<button\b|<Button\b/g) || [];
  const inputMatches = content.match(/<input\b|<Input\b/g) || [];
  const selectMatches = content.match(/<select\b|<Select\b/g) || [];

  const imports: string[] = [];
  const importRegex = /(?:import\s+(?:[\w*\s{},]+from\s+)?['"]([^'"]+)['"])|(?:nextDynamic\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\))/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const imp = match[1] || match[2];
    if (imp) imports.push(imp);
  }

  return {
    isClient,
    buttonCount: buttonMatches.length,
    inputCount: inputMatches.length,
    selectCount: selectMatches.length,
    imports,
  };
}

function classifyRouteModule(route: string): "Dispatch" | "Fleet" | "Billing" | "Admin" | "Driver" | "Operator" | "Shared" {
  if (route.startsWith("/staff/dispatch") || route.startsWith("/staff/live")) return "Dispatch";
  if (route.startsWith("/staff/fleet") || route.startsWith("/staff/tools")) return "Fleet";
  if (
    route.startsWith("/staff/invoices") ||
    route.startsWith("/staff/payments") ||
    route.startsWith("/staff/cash") ||
    route.startsWith("/staff/settlements") ||
    route.startsWith("/staff/customers") ||
    route.startsWith("/staff/projects") ||
    route.startsWith("/staff/contractors")
  ) {
    return "Billing";
  }
  if (route.startsWith("/admin") || route.startsWith("/owner")) return "Admin";
  if (route.startsWith("/driver")) return "Driver";
  if (route.startsWith("/operator")) return "Operator";
  return "Shared";
}

function traverseRoute(pageFile: string): {
  clientComponents: string[];
  modals: string[];
  buttons: number;
  inputs: number;
  selects: number;
} {
  const visited = new Set<string>();
  const clientComponents = new Set<string>();
  const modals = new Set<string>();
  let totalButtons = 0;
  let totalInputs = 0;
  let totalSelects = 0;

  function visit(filePath: string) {
    if (visited.has(filePath)) return;
    visited.add(filePath);

    const relPath = path.relative(path.resolve(__dirname, ".."), filePath).replace(/\\/g, "/");
    const parsed = parseFileImportsAndElements(filePath);

    totalButtons += parsed.buttonCount;
    totalInputs += parsed.inputCount;
    totalSelects += parsed.selectCount;

    if (parsed.isClient && filePath !== pageFile) {
      clientComponents.add(relPath);
    }

    const baseName = path.basename(filePath);
    if (baseName.toLowerCase().includes("modal") || baseName.toLowerCase().includes("dialog")) {
      modals.add(baseName.replace(/\.tsx?$/, ""));
    }

    // Check for inline modals in UnifiedLiveOperationsClient
    if (baseName === "UnifiedLiveOperationsClient.tsx") {
      modals.add("Edit Store Location Modal (inline)");
      modals.add("Edit Site Location Modal (inline)");
    }

    const currentDir = path.dirname(filePath);
    for (const imp of parsed.imports) {
      const resolved = resolveImportPath(imp, currentDir);
      if (resolved && resolved.startsWith(SRC_DIR)) {
        visit(resolved);
      }
    }
  }

  visit(pageFile);

  return {
    clientComponents: Array.from(clientComponents).sort(),
    modals: Array.from(modals).sort(),
    buttons: totalButtons,
    inputs: totalInputs,
    selects: totalSelects,
  };
}

function scanAppRoutes(): RouteInfo[] {
  const routes: RouteInfo[] = [];

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name === "page.tsx") {
        let route = path.relative(APP_DIR, dir).replace(/\\/g, "/");
        if (route === "") route = "/";
        else route = "/" + route;

        if (route.includes("_not-found") || route.includes("not-found")) continue;

        const relPage = path.relative(path.resolve(__dirname, ".."), fullPath).replace(/\\/g, "/");
        const details = traverseRoute(fullPath);

        routes.push({
          route,
          module: classifyRouteModule(route),
          pageFile: relPage,
          clientComponents: details.clientComponents,
          modals: details.modals,
          buttons: details.buttons,
          inputs: details.inputs,
          selects: details.selects,
        });
      }
    }
  }

  scanDir(APP_DIR);
  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

function extractCurrentZIndex(content: string): string {
  if (content.includes("z-modal") && content.includes("z-overlay")) {
    return "z-modal (1100) / z-overlay (1000)";
  }
  if (content.includes("z-modal")) return "z-modal (1100)";
  if (content.includes("z-overlay")) return "z-overlay (1000)";

  const zMatches = content.match(/z-(?:\[\w+\]|\d+)/g);
  if (!zMatches) return "none";
  const sorted = [...zMatches].sort((a, b) => {
    const valA = parseInt(a.replace(/\D/g, "") || "0");
    const valB = parseInt(b.replace(/\D/g, "") || "0");
    return valB - valA;
  });
  return sorted[0] || "none";
}

function scanAllModals(): ModalInfo[] {
  const modals: ModalInfo[] = [];

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const base = entry.name;
        if (base.toLowerCase().includes("modal") || base.toLowerCase().includes("dialog")) {
          const relPath = path.relative(path.resolve(__dirname, ".."), fullPath).replace(/\\/g, "/");
          const content = fs.readFileSync(fullPath, "utf-8");
          const curZ = extractCurrentZIndex(content);

          let targetZ = "z-modal (1100) / z-overlay (1000)";
          let module = "Module 4.x";
          let type: ModalInfo["type"] = "Standalone Component";

          if (base === "dialog.tsx") {
            type = "Radix UI Primitive";
            module = "Shared Primitive";
            targetZ = "z-modal (1100) / z-overlay (1000)";
          } else if (relPath.includes("components/fleet/MachineModal.tsx") || relPath.includes("components/fleet/VehicleModal.tsx")) {
            type = "Dead Code Component";
            module = "Module 4.1 Fleet (To delete)";
            targetZ = "N/A (Dead Code - 0 imports)";
          } else if (base.includes("MyProfileModal")) {
            module = "Module 4.0 Layout Shell";
            targetZ = "z-modal (1100) [Below Toast 1200]";
          } else if (base.includes("Machine") || base.includes("Vehicle") || base.includes("Tool")) {
            module = "Module 4.1 Fleet & Equipment";
          } else if (base.includes("Dispatch") || base.includes("SiteLocationPin")) {
            module = "Module 4.2 Orders & Dispatch";
          } else if (base.includes("Receivable") || base.includes("Payment") || base.includes("Billing")) {
            module = "Module 4.3 Customers & Billing";
          } else if (base.includes("Wage") || base.includes("Labor") || base.includes("Employee") || base.includes("Operator")) {
            module = "Module 4.4 HR & Field Team";
          } else if (base.includes("Route") || base.includes("Live")) {
            module = "Module 4.6 GIS & Live Operations";
          } else {
            module = "Module 4.7 Shared";
          }

          modals.push({
            name: base.replace(/\.tsx?$/, ""),
            type,
            file: relPath,
            currentZIndex: curZ,
            targetZIndex: targetZ,
            module,
            associatedRoutes: [],
          });
        }
      }
    }
  }

  scanDir(SRC_DIR);

  // Add the 2 inline modals in UnifiedLiveOperationsClient
  modals.push({
    name: "Edit Store Location Modal (inline)",
    type: "Inline Dialog",
    file: "src/app/staff/live/map/UnifiedLiveOperationsClient.tsx (lines 1393-1480)",
    currentZIndex: "z-50",
    targetZIndex: "z-modal (1100) / z-overlay (1000)",
    module: "Module 4.1/4.6 Live Operations",
    associatedRoutes: ["/staff/live/map"],
  });

  modals.push({
    name: "Edit Site Location Modal (inline)",
    type: "Inline Dialog",
    file: "src/app/staff/live/map/UnifiedLiveOperationsClient.tsx (lines 1583-1670)",
    currentZIndex: "z-50",
    targetZIndex: "z-modal (1100) / z-overlay (1000)",
    module: "Module 4.1/4.6 Live Operations",
    associatedRoutes: ["/staff/live/map"],
  });

  return modals.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
}

const routes = scanAppRoutes();
const modals = scanAllModals();

console.log(`Discovered ${routes.length} active routes and ${modals.length} modal entries.`);

fs.writeFileSync(
  path.resolve(__dirname, "../route-inventory.json"),
  JSON.stringify({ routes, modals }, null, 2),
  "utf-8"
);
console.log("Exported route-inventory.json successfully.");
