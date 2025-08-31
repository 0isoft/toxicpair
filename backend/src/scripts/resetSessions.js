// backend/src/scripts/resetSessions.js
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    // Option A: just archive existing sessions so /solve creates fresh ones
    await prisma.session.updateMany({ data: { status: "archived" } });

    // If you prefer deletion (ensure FK order is correct for your schema):
    // await prisma.chatMessage.deleteMany({});
    // await prisma.sessionParticipant?.deleteMany?.({}); // if you have this model
    // await prisma.session.deleteMany({});

    console.log("Sessions archived. Next /solve will create fresh snapshots.");
  } catch (e) {
    console.error("Reset failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
