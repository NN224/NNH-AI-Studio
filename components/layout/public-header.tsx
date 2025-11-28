"use client";

import LanguageSwitcher from "@/components/ui/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-8 z-50 w-full border-b border-primary/20 bg-black/95 backdrop-blur-xl"
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/nnh-logo.png"
              alt="NNH Logo"
              width={40}
              height={40}
              className="object-contain group-hover:scale-110 transition-transform"
            />
            <span className="text-xl font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              NNH - AI Studio
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/help"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Help
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Button
              variant="ghost"
              asChild
              className="hidden sm:flex text-muted-foreground hover:text-primary"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button
              asChild
              className="hidden sm:flex bg-linear-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              <Link href="/auth/signup">Get Started</Link>
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-muted-foreground hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden fixed inset-x-0 top-16 z-40 bg-black/95 backdrop-blur-xl border-b border-primary/20"
        >
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <Link
              href="/pricing"
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link
              href="/blog"
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/help"
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Help
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-primary transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>

            <div className="pt-4 border-t border-primary/20 flex flex-col gap-3">
              <Button variant="outline" asChild className="w-full">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </Button>
              <Button
                asChild
                className="w-full bg-linear-to-r from-primary to-accent"
              >
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </Button>
            </div>
          </nav>
        </motion.div>
      )}
    </>
  );
}
