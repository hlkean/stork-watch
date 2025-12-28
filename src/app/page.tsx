export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-12 px-6 py-16 sm:px-10">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Stork Watch
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Share pregnancy updates calmly via SMS and web.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600">
            Invite family and friends, post updates from your phone, and keep
            everyone in the loop without managing endless group chats.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
            >
              Get started
            </a>
            <a
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
            >
              Log in
            </a>
          </div>
        </header>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              SMS-first updates
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Send milestones by texting your Stork Watch number and automatically
              notify subscribers.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Private pregnancy page
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              A single place for updates, photos, and birth announcements with
              OTP-protected access.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">
              Invite & segment
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Invite subscribers by phone or email, group them (family, friends,
              work), and target the right audience.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
