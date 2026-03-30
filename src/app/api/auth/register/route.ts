import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, companyName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organization
    const slug = (companyName || fullName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now().toString(36);

    const org = await prisma.organization.create({
      data: {
        name: companyName || `${fullName}'s Company`,
        slug,
        plan: "starter",
        settings: {},
      },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name: fullName,
        hashedPassword,
        role: "owner",
        orgId: org.id,
      },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      orgId: org.id,
    }, { status: 201 });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed" },
      { status: 500 }
    );
  }
}
