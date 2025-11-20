'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Link2, 
  MapPin, 
  Sparkles, 
  Settings, 
  Rocket,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { getDashboardUrl, getLocaleFromPathname } from '@/lib/utils/navigation';
import { usePathname } from 'next/navigation';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export default function OnboardingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPathname(pathname);
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [gmbConnected, setGmbConnected] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth/login`);
      }
    };
    checkAuth();
  }, [router, locale, supabase]);

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: 'Welcome to NNH AI Studio',
      description: 'Let\'s get you set up in just a few steps',
      icon: <Rocket className="h-8 w-8" />,
      component: <WelcomeStep onNext={() => setCurrentStep(2)} />,
    },
    {
      id: 2,
      title: 'Connect Google Business Profile',
      description: 'Link your Google Business account to manage your locations',
      icon: <Link2 className="h-8 w-8" />,
      component: (
        <ConnectGMBStep 
          onNext={() => setCurrentStep(3)} 
          onConnected={() => setGmbConnected(true)}
        />
      ),
    },
    {
      id: 3,
      title: 'Select Your Locations',
      description: 'Choose which business locations you want to manage',
      icon: <MapPin className="h-8 w-8" />,
      component: (
        <SelectLocationsStep 
          onNext={() => setCurrentStep(4)}
          onLocationsSelected={setSelectedLocations}
        />
      ),
    },
    {
      id: 4,
      title: 'Configure AI Settings',
      description: 'Set up your AI assistant for automatic responses',
      icon: <Sparkles className="h-8 w-8" />,
      component: <AISetupStep onNext={() => setCurrentStep(5)} />,
    },
    {
      id: 5,
      title: 'All Set!',
      description: 'You\'re ready to start managing your business',
      icon: <CheckCircle2 className="h-8 w-8" />,
      component: <CompletionStep onComplete={handleComplete} />,
    },
  ];

  async function handleComplete() {
    try {
      setIsLoading(true);
      
      if (!supabase) return;
      
      // Mark onboarding as completed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
          });
      }

      toast.success('Setup complete! Welcome to NNH AI Studio 🎉');
      router.push(getDashboardUrl(locale));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const currentStepData = steps[currentStep - 1];
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </p>
            <p className="text-sm font-medium">{Math.round(progress)}% Complete</p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {currentStepData.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                    <p className="text-muted-foreground">{currentStepData.description}</p>
                  </div>
                </div>

                {currentStepData.component}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`h-2 w-2 rounded-full transition-colors ${
                  step.id === currentStep
                    ? 'bg-primary'
                    : step.id < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            onClick={() => router.push(getDashboardUrl(locale))}
          >
            Skip Setup
          </Button>
        </div>
      </div>
    </div>
  );
}

// Step Components
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h3 className="text-xl font-semibold mb-4">
          Welcome! Let's get your account set up.
        </h3>
        <p className="text-muted-foreground mb-6">
          This quick setup will help you connect your Google Business Profile,
          configure AI settings, and start managing your online presence.
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-2">
              <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-sm font-medium">Connect</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mx-auto mb-2">
              <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm font-medium">Configure</p>
          </div>
          <div className="text-center">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-2">
              <Rocket className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm font-medium">Launch</p>
          </div>
        </div>
      </div>

      <Button onClick={onNext} className="w-full" size="lg">
        Get Started
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function ConnectGMBStep({ 
  onNext, 
  onConnected 
}: { 
  onNext: () => void; 
  onConnected: () => void;
}) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      // Trigger GMB OAuth flow
      window.location.href = '/api/gmb/oauth';
    } catch (error) {
      console.error('GMB connection error:', error);
      toast.error('Failed to connect. Please try again.');
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-4">
          <Link2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="text-muted-foreground mb-4">
          Connect your Google Business Profile to start managing reviews,
          questions, and posts from one dashboard.
        </p>
      </div>

      <div className="space-y-3">
        <Button 
          onClick={handleConnect} 
          className="w-full" 
          size="lg"
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Connecting...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Connect Google Business Profile
            </>
          )}
        </Button>

        <Button onClick={onNext} variant="outline" className="w-full">
          I'll do this later
        </Button>
      </div>
    </div>
  );
}

function SelectLocationsStep({
  onNext,
  onLocationsSelected,
}: {
  onNext: () => void;
  onLocationsSelected: (locations: string[]) => void;
}) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Your locations will appear here after connecting your Google Business Profile.
      </p>

      <Button onClick={onNext} className="w-full" size="lg">
        Continue
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function AISetupStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="h-20 w-20 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-10 w-10 text-purple-600 dark:text-purple-400" />
        </div>
        <p className="text-muted-foreground mb-4">
          Configure your AI assistant to automatically respond to reviews and
          answer customer questions.
        </p>
      </div>

      <div className="space-y-3">
        <Button onClick={onNext} className="w-full" size="lg">
          Configure AI Settings
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>

        <Button onClick={onNext} variant="outline" className="w-full">
          Skip for now
        </Button>
      </div>
    </div>
  );
}

function CompletionStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
        <p className="text-muted-foreground mb-4">
          Your account is ready. Start managing your business presence with AI-powered tools.
        </p>
      </div>

      <Button onClick={onComplete} className="w-full" size="lg">
        Go to Dashboard
        <Rocket className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
