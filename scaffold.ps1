$base = "c:\Users\AKSHAI RAJESH\project\project7\src"

$dirs = @(
    "actions",
    "app\(admin)\dashboard",
    "app\(admin)\orders\[id]",
    "app\(admin)\fleet",
    "app\(admin)\employees",
    "app\(admin)\settlements",
    "app\(admin)\cash",
    "app\(driver)\home",
    "app\(driver)\orders\[id]",
    "app\(driver)\expenses",
    "app\api\auth\[...nextauth]",
    "components\admin",
    "components\driver",
    "lib"
)

foreach ($dir in $dirs) {
    $fullPath = Join-Path $base $dir
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
    Write-Host "Created: $fullPath"
}

# Create placeholder files for actions
$placeholders = @{
    "src\actions\orders.ts"      = "'use server'`n// Rental order server actions - ZERO GROUP`n"
    "src\actions\driver.ts"      = "'use server'`n// Driver shift log and expense server actions - ZERO GROUP`n"
    "src\actions\settlement.ts"  = "'use server'`n// Weekend settlement calculation server actions - ZERO GROUP`n"
    "src\actions\auth.ts"        = "'use server'`n// Auth sign-in/sign-out wrappers - ZERO GROUP`n"
    "src\lib\prisma.ts"          = "// Singleton Prisma client - ZERO GROUP`n"
    "src\lib\auth.ts"            = "// NextAuth v5 configuration - ZERO GROUP`n"
    "src\lib\utils.ts"           = "// cn(), formatCurrency(), etc. - ZERO GROUP`n"
    "src\lib\validations.ts"     = "// All Zod schemas - ZERO GROUP`n"
    "src\middleware.ts"          = "// Edge route guard - ZERO GROUP`n"
    "src\components\admin\OrdersTable.tsx"          = "// Admin orders table with server-side pagination`n"
    "src\components\admin\SettlementDashboard.tsx"  = "// Weekend settlement dashboard`n"
    "src\components\admin\CashCollectionForm.tsx"   = "// Cash collection form`n"
    "src\components\admin\DispatchForm.tsx"         = "// Rental order dispatch form`n"
    "src\components\driver\ShiftSelector.tsx"       = "// Vehicle picker + shift log creation`n"
    "src\components\driver\OrderCard.tsx"           = "// Driver order card with optimistic updates`n"
    "src\components\driver\ExpenseForm.tsx"         = "// Expense submission form`n"
    "src\components\driver\IOSInstallPrompt.tsx"    = "// iOS Safari Add to Home Screen prompt`n"
}

foreach ($entry in $placeholders.GetEnumerator()) {
    $fullPath = Join-Path "c:\Users\AKSHAI RAJESH\project\project7" $entry.Key
    $content = $entry.Value -replace '`n', "`n"
    Set-Content -Path $fullPath -Value $content -Encoding UTF8
    Write-Host "Created: $fullPath"
}

Write-Host "`nALL SCAFFOLD COMPLETE"
