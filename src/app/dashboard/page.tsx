import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";

export default async function DashboardPage() {
  const sessionUser = (await cookies()).get("session_user")?.value;
  if (!sessionUser) {
    redirect("/register");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser },
    include: {
      memberships: {
        include: {
          pregnancy: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/register");
  }

  const pregnancies = user.memberships.map((member) => member.pregnancy);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12 sm:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              Dashboard
            </p>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Welcome back, {user.firstName} {user.lastName}
            </h1>
            <p className="text-base text-zinc-600">
              Here&apos;s your pregnancy info and updates at a glance.
            </p>
          </div>
          <form method="post" action={logout}>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              Log out
            </button>
          </form>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {pregnancies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-zinc-600">
              No pregnancies yet. Create one to get started.
            </div>
          ) : (
            pregnancies.map((pregnancy) => (
              <div
                key={pregnancy.id}
                className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900">
                      {pregnancy.nickname || "Pregnancy"}
                    </h2>
                    <p className="text-sm text-zinc-600">
                      Slug: {pregnancy.slug}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {pregnancy.status}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-700">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Due / Birth Date
                    </dt>
                    <dd className="font-medium">
                      {pregnancy.birthDate
                        ? new Date(pregnancy.birthDate).toLocaleDateString()
                        : pregnancy.dueDate
                          ? new Date(pregnancy.dueDate).toLocaleDateString()
                          : "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Baby name
                    </dt>
                    <dd className="font-medium">
                      {pregnancy.babyName || "Not set"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Sex
                    </dt>
                    <dd className="font-medium">
                      {pregnancy.sex || "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">
                      Status
                    </dt>
                    <dd className="font-medium">{pregnancy.status}</dd>
                  </div>
                </dl>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
