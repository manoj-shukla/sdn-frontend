import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { WorldMap } from "@/components/ui/world-map";
import { BookDemoDialog } from "@/components/public/book-demo-dialog";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-16 pb-20">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-pink-100/50 blur-[100px]" />
        <div className="absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-yellow-50/50 blur-[100px]" />

        {/* Animated World Map Background */}
        {/* Animated World Map Background */}
        <WorldMap className="absolute inset-0 top-20 w-full h-full text-slate-200" />

        <div className="container relative z-10 px-4 text-center md:px-6 flex flex-col items-center">

          {/* Badge */}
          <div className="mb-8 inline-flex items-center rounded-full border bg-white/50 px-4 py-1.5 text-sm font-medium text-blue-600 shadow-sm backdrop-blur-sm">
            <span className="mr-2 h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Trusted by Global Enterprises
          </div>

          {/* Headline */}
          <h1 className="mb-6 max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
            Powering the <br />
            <span className="text-blue-600">Global Supply Chain</span>
          </h1>

          {/* Subheadline */}
          <p className="mb-10 max-w-2xl text-lg text-slate-600 md:text-xl">
            Connect, collaborate, and comply. The unified platform ensuring visibility and control from procurement to payment.
          </p>

          {/* CTAs */}
          <div className="mb-20 flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="h-12 w-full min-w-[160px] bg-blue-600 px-8 text-base font-semibold text-white hover:bg-blue-700 sm:w-auto">
              <Link href="/auth/login">Get Started</Link>
            </Button>
            <BookDemoDialog>
              <Button size="lg" variant="outline" className="h-12 w-full min-w-[160px] border-slate-200 bg-white px-8 text-base font-semibold text-slate-900 hover:bg-slate-50 sm:w-auto">
                Contact Sales
              </Button>
            </BookDemoDialog>
          </div>

          {/* 3-Card Flow Layout */}
          <div className="relative grid w-full max-w-5xl gap-8 md:grid-cols-3">
            {/* Connecting Dashed Line (Desktop) */}
            <div className="absolute top-1/2 left-0 hidden h-px w-full -translate-y-1/2 border-t-2 border-dashed border-slate-200 md:block lg:w-[90%] lg:left-[5%]" aria-hidden="true" />

            {/* Card 1: Enterprise */}
            <div className="relative flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-lg transition-transform hover:-translate-y-1">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-4xl shadow-sm ring-1 ring-slate-100">
                🏢
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">Enterprise</h3>
              <p className="text-sm font-medium text-slate-500">Procurement & Compliance</p>
            </div>

            {/* Card 2: Suppliers */}
            <div className="relative flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-lg transition-transform hover:-translate-y-1">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-4xl shadow-sm ring-1 ring-slate-100">
                🚛
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">Suppliers</h3>
              <p className="text-sm font-medium text-slate-500">Onboarding & Management</p>
            </div>

            {/* Card 3: Vendors */}
            <div className="relative flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-lg transition-transform hover:-translate-y-1">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-4xl shadow-sm ring-1 ring-slate-100">
                🤝
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">Vendors</h3>
              <p className="text-sm font-medium text-slate-500">Staffing & Services</p>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
