import { seedEssentialUsers, DEFAULT_ACCOUNTS } from "../src/lib/seed-users";

export { seedEssentialUsers, DEFAULT_ACCOUNTS };

if (require.main === module) {
  seedEssentialUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed error:", err);
      process.exit(1);
    });
}
