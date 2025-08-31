const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const id = Number(process.argv[2] || 1);
  try {
    await prisma.$transaction(async (tx) => {
      // Delete children first (add any other referencing tables you have)
      await tx.attempt.deleteMany({ where: { problemId: id } });
      await tx.problemPersona.deleteMany({ where: { problemId: id } });
      // e.g., await tx.submission.deleteMany({ where: { problemId: id } });

      await tx.problem.delete({ where: { id } });
    });
    console.log('✅ Deleted Problem', id);
  } catch (e) {
    console.error('❌ Delete failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
