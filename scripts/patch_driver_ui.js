const fs = require('fs');

// 1. Update DriverOrderClient.tsx
const clientPath = 'src/app/driver/orders/[id]/DriverOrderClient.tsx';
let clientContent = fs.readFileSync(clientPath, 'utf8');

if (!clientContent.includes('Phone')) {
  clientContent = clientContent.replace('  Calendar', '  Calendar,\n  Phone');
}

const targetStr = `          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Customer: <strong className="text-white font-bold">{dispatch.customer?.name}</strong></span>
          </div>`;

const replacementStr = `          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <User className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Customer: <strong className="text-white font-bold">{dispatch.customer?.name}</strong></span>
            </div>
            {dispatch.customer?.phone && (
              <a
                href={\`tel:\${dispatch.customer.phone}\`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold text-xs shrink-0 active:scale-95 transition-all shadow-sm"
                title="Call Customer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Call ({dispatch.customer.phone})</span>
              </a>
            )}
          </div>`;

clientContent = clientContent.split(/\r?\n/).join('\n');
const targetNorm = targetStr.split(/\r?\n/).join('\n');
const replacementNorm = replacementStr.split(/\r?\n/).join('\n');

if (clientContent.includes(targetNorm)) {
  clientContent = clientContent.replace(targetNorm, replacementNorm);
  fs.writeFileSync(clientPath, clientContent.replace(/\n/g, '\r\n'), 'utf8');
  console.log('DriverOrderClient.tsx patched successfully');
} else {
  console.log('Target not found in DriverOrderClient.tsx');
}

// 2. Update page.tsx
const pagePath = 'src/app/driver/orders/[id]/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/).join('\n');
if (!pageContent.includes('hideDestinationHeader={true}')) {
  pageContent = pageContent.replace(
    'customerPhone={dispatch.customer?.phone}',
    'customerPhone={dispatch.customer?.phone}\n          hideDestinationHeader={true}'
  );
  fs.writeFileSync(pagePath, pageContent.replace(/\n/g, '\r\n'), 'utf8');
  console.log('page.tsx patched successfully');
}
