"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageSquare, Clock, Send } from "lucide-react";
import { useState, useEffect } from "react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Contact Us | NNH - AI Studio";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Get in touch with NNH AI Studio. Contact our support team for questions, demo requests, or assistance.",
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      company: formData.get("company") as string,
      subject: formData.get("subject") as string,
      message: formData.get("message") as string,
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit form");
      }

      setSubmitted(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        (e.target as HTMLFormElement).reset();
      }, 3000);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 max-w-6xl relative">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Get in Touch
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Have questions? We'd love to hear from you. Send us a message
                and we'll respond as soon as possible.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <Card className="border-border/40 bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    {submitted ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                          <Send className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">
                          Message Sent!
                        </h3>
                        <p className="text-muted-foreground">
                          Thank you for contacting us. We'll get back to you
                          shortly.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="name"
                              className="block text-sm font-medium mb-2"
                            >
                              Full Name *
                            </label>
                            <Input
                              id="name"
                              name="name"
                              required
                              placeholder="John Doe"
                              className="bg-background border-border/40"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="email"
                              className="block text-sm font-medium mb-2"
                            >
                              Email Address *
                            </label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              required
                              placeholder="john@example.com"
                              className="bg-background border-border/40"
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label
                              htmlFor="phone"
                              className="block text-sm font-medium mb-2"
                            >
                              Phone Number
                            </label>
                            <Input
                              id="phone"
                              name="phone"
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              className="bg-background border-border/40"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="company"
                              className="block text-sm font-medium mb-2"
                            >
                              Company
                            </label>
                            <Input
                              id="company"
                              name="company"
                              placeholder="Your Company"
                              className="bg-background border-border/40"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="subject"
                            className="block text-sm font-medium mb-2"
                          >
                            Subject *
                          </label>
                          <Input
                            id="subject"
                            name="subject"
                            required
                            placeholder="How can we help you?"
                            className="bg-background border-border/40"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="message"
                            className="block text-sm font-medium mb-2"
                          >
                            Message *
                          </label>
                          <Textarea
                            id="message"
                            name="message"
                            required
                            rows={6}
                            placeholder="Tell us more about your inquiry..."
                            className="bg-background border-border/40"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full gap-2"
                          size="lg"
                        >
                          {isSubmitting ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <div className="space-y-6">
                {/* Email */}
                <Card className="border-border/40 bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Email</h3>
                        <a
                          href="mailto:support@nnh.ae"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          support@nnh.ae
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phone */}
                <Card className="border-border/40 bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Phone className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Phone</h3>
                        <a
                          href="tel:+971543665548"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          +971 543-6655-48
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Live Chat */}
                <Card className="border-border/40 bg-card/50 backdrop-blur">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <MessageSquare className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Live Chat</h3>
                        <p className="text-muted-foreground text-sm">
                          Available Mon-Fri
                          <br />
                          9:00 AM - 5:00 PM EST
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Office Hours */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">Office Hours</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Monday - Friday</p>
                          <p className="font-medium text-foreground">
                            9:00 AM - 6:00 PM EST
                          </p>
                          <p className="mt-2">Saturday - Sunday</p>
                          <p className="font-medium text-foreground">Closed</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
