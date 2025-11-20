"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import Link from "next/link";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { authService } from "@/lib/services/auth-service";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getRedirectUrl, getLocaleFromPathname } from "@/lib/utils/navigation";

const Logo = () => {
  return (
    <div className="w-20 h-20 rounded-full bg-[hsl(var(--neuro-bg))] flex items-center justify-center mb-8 shadow-[inset_8px_8px_16px_hsl(var(--shadow-dark)),inset_-8px_-8px_16px_hsl(var(--shadow-light))]">
      <div className="text-4xl font-bold text-[#ff1493]">G</div>
    </div>
  );
};

interface InputFieldProps {
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  showPasswordToggle?: boolean;
  error?: string;
  disabled?: boolean;
  name: string;
}

const InputField = ({
  type,
  placeholder,
  value,
  onChange,
  showPasswordToggle = false,
  error,
  disabled = false,
  name,
}: InputFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputType = showPasswordToggle
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className="relative mb-6">
      <input
        type={inputType}
        placeholder={placeholder}
        value={value}
        name={name}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className={`w-full px-6 py-4 bg-[hsl(var(--neuro-bg))] rounded-2xl text-foreground placeholder-muted-foreground outline-none transition-all duration-200 font-mono ${
          isFocused
            ? "shadow-[inset_6px_6px_12px_hsl(var(--shadow-dark)),inset_-6px_-6px_12px_hsl(var(--shadow-light))] ring-2 ring-[#ff149380]"
            : "shadow-[inset_8px_8px_16px_hsl(var(--shadow-dark)),inset_-8px_-8px_16px_hsl(var(--shadow-light))]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      )}
      {error && <p className="text-sm text-destructive mt-1 ml-2">{error}</p>}
    </div>
  );
};

const LoginButton = ({ isLoading }: { isLoading: boolean }) => {
  return (
    <motion.button
      type="submit"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      disabled={isLoading}
      className={`w-full py-4 bg-[hsl(var(--neuro-bg))] rounded-2xl text-[#ff1493] text-lg mb-6 shadow-[8px_8px_16px_hsl(var(--shadow-dark)),-8px_-8px_16px_hsl(var(--shadow-light))] hover:shadow-[6px_6px_12px_hsl(var(--shadow-dark)),-6px_-6px_12px_hsl(var(--shadow-light))] active:shadow-[inset_4px_4px_8px_hsl(var(--shadow-dark)),inset_-4px_-4px_8px_hsl(var(--shadow-light))] transition-all duration-200 font-mono font-normal ${
        isLoading ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {isLoading ? "Signing in..." : "Sign In"}
    </motion.button>
  );
};

function LoginPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = getLocaleFromPathname(pathname);
  const redirectTo = getRedirectUrl(searchParams, locale);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const {
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await authService.signIn(email, password, false);

      toast.success("Welcome back!");

      // Use the redirect URL from params or default to dashboard
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to sign in";

      if (errorMessage.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (errorMessage.includes("Email not confirmed")) {
        setError("Please verify your email address before signing in.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <h1 className="text-3xl text-center font-mono font-black text-muted-foreground mt-20 mb-6">
        Sign In
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md mx-auto bg-[hsl(var(--neuro-bg))] rounded-3xl p-8 shadow-[20px_20px_40px_hsl(var(--shadow-dark)),-20px_-20px_40px_hsl(var(--shadow-light))] mt-4"
      >
        <div className="flex flex-col items-center">
          <Logo />

          {error && (
            <Alert variant="destructive" className="mb-4 w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={onSubmit} className="w-full">
            <InputField
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              disabled={isLoading}
              error={errors.email?.message}
            />

            <InputField
              type="password"
              name="password"
              placeholder="Password"
              value={password}
              onChange={setPassword}
              showPasswordToggle={true}
              disabled={isLoading}
              error={errors.password?.message}
            />

            <LoginButton isLoading={isLoading} />
          </form>

          <div className="w-full flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-sm font-mono">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="w-full mb-6">
            <OAuthButtons mode="signin" />
          </div>

          <div className="flex justify-between items-center text-sm w-full">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-[#ff1493] hover:underline transition-all duration-200 font-mono"
            >
              Forgot password?
            </Link>
            <Link
              href="/signup"
              className="text-muted-foreground hover:text-[#ff1493] hover:underline transition-all duration-200 font-mono"
            >
              or Sign up
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center min-h-screen">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
