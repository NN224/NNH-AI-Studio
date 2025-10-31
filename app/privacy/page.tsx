import { PublicHeader } from "@/components/layout/public-header"
import { PublicFooter } from "@/components/layout/public-footer"
import { Shield } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />
      
      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
          
          <div className="container mx-auto px-4 max-w-4xl relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Privacy Policy
              </h1>
              <p className="text-muted-foreground text-lg">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-8 text-muted-foreground">
              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
                <p className="mb-4">
                  We collect information you provide directly to us, including name, email address, business information,
                  and Google My Business account data when you connect your GMB accounts to our platform.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
                <p className="mb-4">We use the information we collect to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process and complete transactions</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                </ul>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. Information Sharing</h2>
                <p className="mb-4">
                  We do not share your personal information with third parties except as described in this policy. We may
                  share information with service providers who perform services on our behalf.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Security</h2>
                <p className="mb-4">
                  We take reasonable measures to help protect your personal information from loss, theft, misuse, and
                  unauthorized access, disclosure, alteration, and destruction.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. Your Rights</h2>
                <p className="mb-4">
                  You have the right to access, update, or delete your personal information at any time through your account
                  settings or by contacting us.
                </p>
              </section>

              <section className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-8">
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at{" "}
                  <a href="mailto:privacy@nnh.ae" className="text-primary hover:underline">
                    privacy@nnh.ae
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
