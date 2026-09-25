const prisma = require("../backend/config/prisma");
const commonController = require("../backend/controller/CommonController");
const { ACCOUNT_TYPE, STATUS, USER_ROLE } = require("../generated/prisma");

const companyData = {
  name: process.env.AUTH_SEED_COMPANY_NAME || "Multi Outlet HQ",
  contactPersonName: process.env.AUTH_SEED_CONTACT_NAME || "System Admin",
  contactPersonEmail:
    process.env.AUTH_SEED_CONTACT_EMAIL ||
    process.env.AUTH_SEED_EMAIL ||
    "admin@example.com",
  contactPersonPhone: process.env.AUTH_SEED_CONTACT_PHONE || "+8801700000000",
  address: process.env.AUTH_SEED_ADDRESS || "House 1, Road 1",
  city: process.env.AUTH_SEED_CITY || "Dhaka",
  state: process.env.AUTH_SEED_STATE || "Dhaka",
  zipCode: process.env.AUTH_SEED_ZIP || "1200",
  country: process.env.AUTH_SEED_COUNTRY || "Bangladesh",
  status: STATUS.ACTIVE,
};

async function main() {
  const email = process.env.AUTH_SEED_EMAIL || "admin@example.com";
  const password = process.env.AUTH_SEED_PASSWORD || "ChangeMe123!";

  const hash = commonController.generateHash();
  const hashPassword = await commonController.generateHashPassword(
    password,
    hash,
  );

  const { company, user } = await prisma.$transaction(async (tx) => {
    const company = await tx.company.upsert({
      where: { contactPersonEmail: companyData.contactPersonEmail },
      update: companyData,
      create: companyData,
    });

    const userData = {
      password: hashPassword,
      hash,
      accountType: ACCOUNT_TYPE.DEVELOPER,
      role: USER_ROLE.SUPER_ADMIN,
      status: STATUS.ACTIVE,
      company: { connect: { id: company.id } },
    };

    const user = await tx.user.upsert({
      where: { email },
      update: userData,
      create: { email, ...userData },
    });

    return { company, user };
  });

  console.log(`Company seeded: ${company.name} (${company.id})`);
  console.log(`Authorization user seeded: ${user.email} -> ${company.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
