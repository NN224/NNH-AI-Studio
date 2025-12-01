"use client";

import { useEffect } from "react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  Database,
  Cloud,
  Zap,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { logger } from "@/lib/utils/logger";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage";
  uptime: string;
  responseTime: string;
  icon: React.ElementType;
}

interface UptimeDay {
  date: string;
  status: "operational" | "degraded" | "outage";
}

interface Incident {
  id: number;
  title: string;
  description: string;
  status: string;
  severity: string;
  startTime: string;
  endTime: string;
  affectedServices: string[];
}

interface Maintenance {
  id: number;
  title: string;
  description: string;
  scheduledFor: string;
  duration: string;
  affectedServices: string[];
  impact: string;
}

export default function StatusPage() {
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [uptimeHistory, setUptimeHistory] = useState<UptimeDay[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Map service names to icons
  const getServiceIcon = (name: string): React.ElementType => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("api")) return Zap;
    if (nameLower.includes("database") || nameLower.includes("db"))
      return Database;
    if (nameLower.includes("auth")) return Activity;
    if (nameLower.includes("google") || nameLower.includes("gmb")) return Cloud;
    if (nameLower.includes("ai")) return Activity;
    if (nameLower.includes("website") || nameLower.includes("web"))
      return Globe;
    return Activity;
  };

  useEffect(() => {
    // Set page title and meta
    document.title = "System Status | NNH - AI Studio";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Check the current operational status of all NNH AI Studio services and systems.",
      );
    }

    // Fetch status from API
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/status");
        const data = await response.json();

        // Add icons to services
        const servicesWithIcons = data.services.map(
          (service: Omit<ServiceStatus, "icon">) => ({
            ...service,
            icon: getServiceIcon(service.name),
          }),
        );

        setServices(servicesWithIcons);
        setUptimeHistory(data.uptimeHistory || []);
        setIncidents(data.incidents || []);
        setMaintenance(data.maintenance || []);
        setLastUpdated(new Date().toLocaleString());
      } catch (error) {
        logger.error(
          "Failed to fetch status",
          error instanceof Error ? error : new Error(String(error)),
        );
        // Use fallback data
        setServices([
          {
            name: "API Services",
            status: "operational",
            uptime: "99.99%",
            responseTime: "45ms",
            icon: Zap,
          },
          {
            name: "Database",
            status: "operational",
            uptime: "99.98%",
            responseTime: "12ms",
            icon: Database,
          },
          {
            name: "Website",
            status: "operational",
            uptime: "99.99%",
            responseTime: "120ms",
            icon: Globe,
          },
        ]);
        setLastUpdated(new Date().toLocaleString());
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Auto-refresh every minute
    const interval = setInterval(fetchStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: ServiceStatus["status"]) => {
    switch (status) {
      case "operational":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Operational
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Degraded
          </Badge>
        );
      case "outage":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="w-3 h-3 mr-1" />
            Outage
          </Badge>
        );
    }
  };

  const allOperational = services.every((s) => s.status === "operational");

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 max-w-5xl relative">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <Activity className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                System Status
              </h1>
              <p className="text-muted-foreground text-lg">
                Current operational status of all services
              </p>
            </div>

            {/* Overall Status */}
            <Card className="border-border/40 bg-card/50 backdrop-blur mb-8">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {allOperational ? (
                      <CheckCircle2 className="w-12 h-12 text-green-500" />
                    ) : (
                      <AlertCircle className="w-12 h-12 text-yellow-500" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold">
                        {allOperational
                          ? "All Systems Operational"
                          : "Some Systems Degraded"}
                      </h2>
                      <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4" />
                        Last updated: {lastUpdated}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Services Status */}
            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3].map((i) => (
                  <Card
                    key={i}
                    className="border-border/40 bg-card/50 backdrop-blur"
                  >
                    <CardContent className="pt-6">
                      <div className="animate-pulse flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg" />
                          <div className="flex-1">
                            <div className="h-5 bg-primary/10 rounded w-32 mb-2" />
                            <div className="h-4 bg-primary/10 rounded w-48" />
                          </div>
                        </div>
                        <div className="w-24 h-6 bg-primary/10 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid gap-4">
                {services.map((service) => {
                  const Icon = service.icon;
                  return (
                    <Card
                      key={service.name}
                      className="border-border/40 bg-card/50 backdrop-blur"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-primary/10">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">
                                {service.name}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>Uptime: {service.uptime}</span>
                                <span>•</span>
                                <span>Response: {service.responseTime}</span>
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(service.status)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* 90-Day Uptime History */}
            {uptimeHistory.length > 0 && (
              <Card className="border-border/40 bg-card/50 backdrop-blur mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>90-Day Uptime History</span>
                    <span className="text-sm text-muted-foreground font-normal">
                      {uptimeHistory[0]?.date} -{" "}
                      {uptimeHistory[uptimeHistory.length - 1]?.date}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {uptimeHistory.map((day, index) => (
                      <div
                        key={index}
                        className={`h-3 w-3 rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${
                          day.status === "operational"
                            ? "bg-green-500"
                            : day.status === "degraded"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        title={`${day.date}: ${day.status}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-green-500" />
                      <span>Operational</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-yellow-500" />
                      <span>Degraded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-red-500" />
                      <span>Outage</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scheduled Maintenance */}
            {maintenance.length > 0 && (
              <Card className="border-yellow-500/30 bg-yellow-500/5 mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-500">
                    <Clock className="w-5 h-5" />
                    Scheduled Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {maintenance.map((item) => (
                      <div
                        key={item.id}
                        className="border-l-4 border-yellow-500 pl-4"
                      >
                        <h4 className="font-semibold text-lg">{item.title}</h4>
                        <p className="text-muted-foreground text-sm mt-1">
                          {item.description}
                        </p>
                        <div className="flex flex-wrap gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            {new Date(item.scheduledFor).toLocaleString()}
                          </span>
                          <span>Duration: {item.duration}</span>
                        </div>
                        <div className="mt-2">
                          <span className="text-sm text-muted-foreground">
                            Affected services:{" "}
                          </span>
                          {item.affectedServices.map((service, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="mr-1 text-xs"
                            >
                              {service}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-yellow-500 mt-2">
                          ⚠️ {item.impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Incidents */}
            <Card className="border-border/40 bg-card/50 backdrop-blur mt-8">
              <CardHeader>
                <CardTitle>Recent Incidents</CardTitle>
              </CardHeader>
              <CardContent>
                {incidents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No incidents reported in the last 90 days
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {incidents.map((incident) => (
                      <div
                        key={incident.id}
                        className="border-l-4 border-primary pl-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">
                                {incident.title}
                              </h4>
                              <Badge
                                className={
                                  incident.severity === "high"
                                    ? "bg-red-500/10 text-red-500"
                                    : incident.severity === "medium"
                                      ? "bg-yellow-500/10 text-yellow-500"
                                      : "bg-blue-500/10 text-blue-500"
                                }
                              >
                                {incident.severity}
                              </Badge>
                              <Badge className="bg-green-500/10 text-green-500">
                                {incident.status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm">
                              {incident.description}
                            </p>
                            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                              <span>
                                Started:{" "}
                                {new Date(incident.startTime).toLocaleString()}
                              </span>
                              <span>•</span>
                              <span>
                                Resolved:{" "}
                                {new Date(incident.endTime).toLocaleString()}
                              </span>
                            </div>
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground">
                                Affected:{" "}
                              </span>
                              {incident.affectedServices.map((service, idx) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="mr-1 text-xs"
                                >
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscribe to Updates */}
            <Card className="border-primary/30 bg-primary/5 mt-8">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    Get Status Updates
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Subscribe to receive notifications about service status
                    changes
                  </p>
                  {subscribed ? (
                    <div className="flex items-center justify-center gap-2 text-green-500">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Successfully subscribed!</span>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch("/api/newsletter", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email, source: "status" }),
                          });
                          if (res.ok) {
                            setSubscribed(true);
                            setEmail("");
                          }
                        } catch (error) {
                          logger.error(
                            "Failed to subscribe",
                            error instanceof Error
                              ? error
                              : new Error(String(error)),
                            { email },
                          );
                        }
                      }}
                      className="flex gap-2 max-w-md mx-auto"
                    >
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="flex-1 px-4 py-2 rounded-lg bg-background border border-border/40 focus:outline-none focus:border-primary/50"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Subscribe
                      </button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
