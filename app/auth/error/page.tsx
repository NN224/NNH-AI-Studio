import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>
}) {
  const params = await searchParams

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black p-4">
      {/* Simple background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src="/nnh-logo.png" 
                alt="NNH AI Studio" 
                className="w-14 h-14 object-contain"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                NNH AI Studio
              </h1>
            </div>
          </Link>
        </div>

        <Card className="bg-card/95 backdrop-blur-xl border-destructive/30 shadow-2xl shadow-destructive/10">
          <CardHeader className="space-y-4 text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
            <CardDescription>
              Something went wrong during sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {params?.error && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium mb-1">
                  Error: {params.error}
                </p>
                {params.error_description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {params.error_description}
                  </p>
                )}
              </div>
            )}
            
            <Button
              asChild
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              <Link href="/auth/login">Try Again</Link>
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Need help?{" "}
              <Link href="/contact" className="text-primary hover:underline font-medium">
                Contact Support
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
