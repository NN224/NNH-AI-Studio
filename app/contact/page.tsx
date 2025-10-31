"use client"

import type React from "react"

import Link from "next/link"
import { ArrowLeft, Mail, MessageSquare, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSubmitting(false)
    // TODO: Implement contact form submission to backend/database
    alert("Thank you for your message! We'll get back to you soon.")
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-4 text-balance">Contact Us</h1>
        <p className="text-gray-400 mb-12">Have questions? We'd love to hear from you.</p>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Name
                </label>
                <Input id="name" required className="bg-[#0A0A0A] border-orange-500/20" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input id="email" type="email" required className="bg-[#0A0A0A] border-orange-500/20" />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <Input id="subject" required className="bg-[#0A0A0A] border-orange-500/20" />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <Textarea id="message" required rows={6} className="bg-[#0A0A0A] border-orange-500/20" />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-500/10 p-3 rounded-lg">
                    <Mail className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <a href="mailto:support@gmbplatform.com" className="text-gray-400 hover:text-orange-500">
                      support@gmbplatform.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-orange-500/10 p-3 rounded-lg">
                    <Phone className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <a href="tel:+1234567890" className="text-gray-400 hover:text-orange-500">
                      +1 (234) 567-890
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-orange-500/10 p-3 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Live Chat</h3>
                    <p className="text-gray-400">Available Mon-Fri, 9am-5pm EST</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] border border-orange-500/20 rounded-lg p-6">
              <h3 className="font-semibold mb-2">Office Hours</h3>
              <p className="text-gray-400 text-sm mb-4">Monday - Friday: 9:00 AM - 6:00 PM EST</p>
              <p className="text-gray-400 text-sm">Saturday - Sunday: Closed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
