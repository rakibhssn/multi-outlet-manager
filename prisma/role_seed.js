const { syncRoles } = require("../backend/helper/Role_Access");

syncRoles()
  .then(() => {
    console.log("Roles and permissions are in sync");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Role sync failed:", error.message);
    process.exit(1);
  });
