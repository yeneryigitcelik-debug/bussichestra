import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/api-utils";
import { getTemplate } from "@/lib/company-templates";
import { AI_MODELS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const { error, prisma, userId, orgId } = await getAuthenticatedContext();
  if (error) return error;

  try {
    const body = await request.json();
    const { companyName, templateId } = body;

    if (!companyName || !templateId) {
      return NextResponse.json({ error: "companyName and templateId required" }, { status: 400 });
    }

    const template = getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: "Invalid template" }, { status: 400 });
    }

    // Update organization name and settings
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        name: companyName,
        settings: {
          industry: templateId,
          template_name: template.name,
          kpis: template.kpis,
          inventory_categories: template.inventoryCategories,
        },
      },
    });

    // Delete existing workers (to replace with template workers)
    await prisma.aiWorker.deleteMany({ where: { orgId } });

    // Delete existing departments
    await prisma.department.deleteMany({ where: { orgId } });

    // Create departments from template
    const deptMap: Record<string, string> = {};
    for (const deptName of template.departments) {
      const dept = await prisma.department.create({
        data: {
          orgId,
          name: deptName,
          description: `${deptName} department for ${companyName}`,
        },
      });
      deptMap[deptName] = dept.id;
    }

    // Create workers from template
    for (const workerTemplate of template.workers) {
      const deptId = deptMap[workerTemplate.department];

      await prisma.aiWorker.create({
        data: {
          orgId,
          departmentId: deptId || null,
          name: workerTemplate.name,
          role: workerTemplate.role,
          persona: workerTemplate.persona,
          email: `${workerTemplate.name.toLowerCase().replace(/[^a-z]/g, "")}@${companyName.toLowerCase().replace(/[^a-z]/g, "")}.ai`,
          status: "active",
          tools: workerTemplate.tools,
          settings: { department_name: workerTemplate.department },
          language: "en",
          isManager: workerTemplate.is_manager,
          model: workerTemplate.is_manager ? AI_MODELS.MANAGER : AI_MODELS.WORKER,
          maxTokens: 4096,
          temperature: 0.7,
        },
      });
    }

    return NextResponse.json({
      success: true,
      orgId,
      template: templateId,
      workers_created: template.workers.length,
      departments_created: template.departments.length,
    });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed" },
      { status: 500 }
    );
  }
}
