"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { signupSchema, type SignupFormData } from "@/lib/validations/auth";
import { authService } from "@/lib/services/auth-service";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

const SignupButton = ({ isLoading }: { isLoading: boolean }) => {
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
      {isLoading ? "Creating account..." : "Create Account"}
    </motion.button>
  );
};

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await authService.signUp(email, password, fullName);

      setSuccess(true);
      toast.success("Account created successfully!");

      // Don't auto-redirect, let user read the message
      // They can click the link when ready
    } catch (err) {
      console.error("Signup error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create account";

      if (errorMessage.includes("already registered")) {
        setError(
          "This email is already registered. Please sign in or use a different email.",
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      await authService.resendVerificationEmail(email);
      toast.success("Verification email sent!");
      setResendCooldown(60); // 60 seconds cooldown

      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Resend email error:", error);
      toast.error("Failed to resend email. Please try again.");
    }
  };

  if (success) {
    return (
      <div className="w-full flex flex-col items-center">
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md mx-auto bg-[hsl(var(--neuro-bg))] rounded-3xl p-8 shadow-[20px_20px_40px_hsl(var(--shadow-dark)),-20px_-20px_40px_hsl(var(--shadow-light))] mt-20"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6 shadow-[inset_8px_8px_16px_hsl(var(--shadow-dark)),inset_-8px_-8px_16px_hsl(var(--shadow-light))]">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2 font-mono">
              Check your email
            </h2>
            <p className="text-muted-foreground mb-2 font-mono text-sm">
              We sent a verification link to:
            </p>
            <p className="font-semibold mb-4 font-mono text-sm">{email}</p>
            <p className="text-xs text-muted-foreground mb-6 font-mono">
              The link will expire in 24 hours.
            </p>

            <div className="w-full space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleResendEmail}
                disabled={resendCooldown > 0}
                className={`w-full py-3 bg-[hsl(var(--neuro-bg))] rounded-2xl text-sm shadow-[8px_8px_16px_hsl(var(--shadow-dark)),-8px_-8px_16px_hsl(var(--shadow-light))] hover:shadow-[6px_6px_12px_hsl(var(--shadow-dark)),-6px_-6px_12px_hsl(var(--shadow-light))] active:shadow-[inset_4px_4px_8px_hsl(var(--shadow-dark)),inset_-4px_-4px_8px_hsl(var(--shadow-light))] transition-all duration-200 font-mono ${
                  resendCooldown > 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend verification email"}
              </motion.button>

              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-transparent rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
                >
                  Already verified? Sign in
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <h1 className="text-3xl text-center font-mono font-black text-muted-foreground mt-20 mb-6">
        Create Account
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
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={fullName}
              onChange={setFullName}
              disabled={isLoading}
              error={errors.fullName?.message}
            />

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

            <InputField
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              showPasswordToggle={true}
              disabled={isLoading}
            />

            <SignupButton isLoading={isLoading} />
          </form>

          <div className="w-full flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-sm font-mono">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="w-full mb-6">
            <OAuthButtons mode="signup" />
          </div>

          <div className="text-center text-sm">
            <span className="text-muted-foreground font-mono">
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="text-[#ff1493] hover:underline font-mono"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
