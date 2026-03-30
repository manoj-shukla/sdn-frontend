import Link from "next/link";
import { LandingNav } from "@/components/layout/landing-nav";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { BookDemoDialog } from "@/components/public/book-demo-dialog";
import { ArrowRight, Zap, Shield, Users, BarChart3, Truck, FileText, CheckCircle2, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
            `
          }}></div>
        </div>

        <div className="container relative z-10 px-4 py-24 md:px-6 lg:py-32 mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-600 border border-blue-200 mx-auto">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse delay-75"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse delay-150"></div>
              </div>
              <span>Trusted by Industry Leaders</span>
            </div>

            {/* Main Headline */}
            <h1 className="mb-6 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-tight">
              Transform Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Supply Chain</span> Operations
            </h1>

            {/* Subheadline */}
            <p className="mb-10 text-xl md:text-2xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              Streamline procurement, supplier management, and compliance with our unified platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-20 justify-center">
              <Button asChild size="lg" className="h-14 px-8 bg-slate-900 text-white hover:bg-slate-800 transition-all hover:scale-105">
                <Link href="/auth/login">Get Started</Link>
              </Button>
              <BookDemoDialog>
                <Button size="lg" variant="outline" className="h-14 px-8 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-50 transition-all hover:scale-105">
                  Request Demo
                </Button>
              </BookDemoDialog>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
              <div className="text-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-slate-900 mb-1">50+</div>
                <div className="text-sm text-slate-600">Suppliers</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-slate-900 mb-1">1K+</div>
                <div className="text-sm text-slate-600">Orders</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-slate-900 mb-1">99%</div>
                <div className="text-sm text-slate-600">Uptime</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl font-bold text-slate-900 mb-1">24/7</div>
                <div className="text-sm text-slate-600">Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything You Need to Succeed</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Comprehensive tools designed for modern supply chain management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:shadow-lg transition-all">
                <Zap className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Real-Time Tracking</h3>
              <p className="text-slate-600 leading-relaxed">
                Monitor your entire supply chain in real-time with live updates and notifications.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:shadow-lg transition-all">
                <Shield className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Secure Platform</h3>
              <p className="text-slate-600 leading-relaxed">
                Enterprise-grade security with encrypted data and compliance standards built-in.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:shadow-lg transition-all">
                <Users className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Team Collaboration</h3>
              <p className="text-slate-600 leading-relaxed">
                Seamless collaboration between suppliers, buyers, and your internal teams.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:shadow-lg transition-all">
                <BarChart3 className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Advanced Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Deep insights and reporting to optimize your supply chain performance.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:shadow-lg transition-all">
                <Truck className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Logistics Management</h3>
              <p className="text-slate-600 leading-relaxed">
                Track shipments, manage inventory, and optimize delivery routes.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-white transition-all hover:-translate-y-1 cursor-pointer">
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-blue-600 group-hover:shadow-lg transition-all">
                <FileText className="h-7 w-7 text-slate-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Document Automation</h3>
              <p className="text-slate-600 leading-relaxed">
                Automate document workflows and ensure compliance with minimal effort.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-slate-50">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">How It Works</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Simple onboarding process to get you started quickly
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Create Account</h3>
              <p className="text-slate-600">
                Sign up and complete your company profile in minutes
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Connect & Verify</h3>
              <p className="text-slate-600">
                Upload documents and get verified by your partners
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Start Collaborating</h3>
              <p className="text-slate-600">
                Begin receiving orders and managing your supply chain
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Why Choose SDN Tech?</h2>
            <p className="text-xl text-slate-600 mb-16 max-w-3xl mx-auto">
              Built by supply chain experts, for supply chain experts. Our platform addresses real-world challenges with innovative solutions.
            </p>

            <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 items-start text-left">
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Industry-Leading Technology</h3>
                  <p className="text-slate-600">Built with the latest tech stack for reliability and performance</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Expert Support Team</h3>
                  <p className="text-slate-600">24/7 support from experienced supply chain professionals</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Flexible & Scalable</h3>
                  <p className="text-slate-600">Grows with your business, from startups to enterprises</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Compliance Ready</h3>
                  <p className="text-slate-600">Built-in compliance checks for international trade standards</p>
                </div>
              </div>
            </div>
            
            <div className="mt-20 relative">
              <div className="w-full max-w-sm mx-auto">
                <div className="aspect-square bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center text-center">
                  <Globe className="w-24 h-24 text-white/80 mb-6" />
                  <div className="text-white">
                    <div className="text-4xl font-bold mb-2">Global Reach</div>
                    <div className="text-lg text-white/80">Connecting businesses worldwide</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Transform Your Supply Chain?</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Join hundreds of companies already optimizing their operations with SDN Tech.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 transition-all hover:scale-105">
                <Link href="/auth/login" className="flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <BookDemoDialog>
                <Button size="lg" variant="outline" className="h-14 px-8 bg-transparent border-2 border-white text-white hover:bg-white/10 transition-all hover:scale-105">
                  Schedule Demo
                </Button>
              </BookDemoDialog>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
