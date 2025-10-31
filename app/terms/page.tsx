import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"
import { FileText } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />
      
      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
          
          <div className="container mx-auto px-4 max-w-4xl relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Terms of Service
              </h1>
              <p className="text-muted-foreground text-lg">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-8 text-muted-foreground">
              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                <p className="mb-4">
                  By accessing and using this service, you accept and agree to be bound by the terms and provision of this
                  agreement.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. Use License</h2>
                <p className="mb-4">
                  Permission is granted to temporarily access the materials on NNH - AI Studio for personal, non-commercial
                  transitory viewing only.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. Account Responsibilities</h2>
                <p className="mb-4">You are responsible for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Ensuring your use complies with applicable laws</li>
                  <li>The accuracy of information you provide</li>
                </ul>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Service Modifications</h2>
                <p className="mb-4">
                  We reserve the right to modify or discontinue the service at any time without notice. We shall not be
                  liable to you or any third party for any modification, suspension, or discontinuance of the service.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. Limitation of Liability</h2>
                <p className="mb-4">
                  In no event shall NNH - AI Studio be liable for any damages arising out of the use or inability to use the
                  materials on our platform.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. Contact</h2>
                <p>
                  Questions about the Terms of Service should be sent to{" "}
                  <a href="mailto:legal@nnh.ae" className="text-primary hover:underline">
                    legal@nnh.ae
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
