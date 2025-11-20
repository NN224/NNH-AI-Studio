"use client";

import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const t = useTranslations("landing");

  const menuItems = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.faq"), href: "#faq" },
    { label: t("nav.contact"), href: "#contact" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
          />

          {/* Menu */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-gradient-to-br from-gray-900 to-black border-l border-orange-500/30 z-50 md:hidden overflow-y-auto"
          >
            <div className="p-6">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Logo */}
              <div className="flex items-center space-x-2 mb-8">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">N</span>
                </div>
                <span className="text-xl font-bold">NNH AI Studio</span>
              </div>

              {/* Menu Items */}
              <nav className="space-y-4 mb-8">
                {menuItems.map((item, index) => (
                  <motion.a
                    key={index}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                      const element = document.querySelector(item.href);
                      element?.scrollIntoView({ behavior: "smooth" });
                    }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="block text-lg text-gray-300 hover:text-orange-500 transition-colors py-2"
                  >
                    {item.label}
                  </motion.a>
                ))}
              </nav>

              {/* Language Switcher */}
              <div className="mb-6">
                <LanguageSwitcher />
              </div>

              {/* CTAs */}
              <div className="space-y-3">
                <Link href="/auth/login" onClick={onClose}>
                  <Button
                    variant="outline"
                    className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                  >
                    {t("nav.signIn")}
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={onClose}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    {t("hero.getStarted")}
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
