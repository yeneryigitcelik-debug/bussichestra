import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AI_MODELS } from "@/lib/constants";
import { DEFAULT_WORKERS } from "@/lib/ai/prompts";

export const dynamic = "force-dynamic";

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
    const orgName = companyName || `${fullName}'s Company`;
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      + "-" + Date.now().toString(36);

    const org = await prisma.organization.create({
      data: {
        name: orgName,
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

    // Create default AI workers so the user has a team immediately
    const defaultDepartments = ["Executive", "Finance", "Sales", "Operations", "Human Resources"];
    const deptMap: Record<string, string> = {};
    for (const deptName of defaultDepartments) {
      const dept = await prisma.department.create({
        data: { orgId: org.id, name: deptName, description: `${deptName} department` },
      });
      deptMap[deptName] = dept.id;
    }

    for (const [key, config] of Object.entries(DEFAULT_WORKERS)) {
      const isManager = "is_manager" in config && Boolean(config.is_manager);
      await prisma.aiWorker.create({
        data: {
          orgId: org.id,
          departmentId: deptMap[config.department] || null,
          name: config.name,
          role: config.role,
          persona: config.persona,
          email: `${key}@${slug.split("-")[0]}.ai`,
          status: "active",
          tools: config.tools,
          settings: { department_name: config.department },
          language: "en",
          isManager,
          model: isManager ? AI_MODELS.MANAGER : AI_MODELS.WORKER,
          maxTokens: 4096,
          temperature: 0.7,
        },
      });
    }

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
