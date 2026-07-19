import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleAdminSlicerRequest, type AdminSlicerDependencies } from "@/lib/admin-slicer";

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 52_428_800);
const SLICER_URL = (process.env.SLICER_SERVICE_URL || "http://localhost:3001").replace(/\/$/, "");

const dependencies: AdminSlicerDependencies = {
  authenticate: async () => {
    const session = await auth();
    return session?.user ? { role: session.user.role } : null;
  },
  findMaterial: (id) => prisma.material.findFirst({
    where: { id, isActive: true },
    select: { id: true },
  }),
  findQuality: (id) => prisma.printQuality.findFirst({
    where: { id, isActive: true },
    select: { id: true },
  }),
  fetcher: fetch,
};

export async function POST(request: Request) {
  return handleAdminSlicerRequest(request, dependencies, {
    maxFileSize: MAX_FILE_SIZE,
    slicerUrl: SLICER_URL,
  });
}
