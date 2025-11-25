"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  MessageSquare,
  TrendingUp,
  ExternalLink,
  Calendar,
  Utensils,
  CalendarCheck,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface BusinessProfileCardProps {
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  coverPhotoUrl?: string;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  healthScore?: number;
  profileCompleteness?: number;
  businessHours?: BusinessHours;
  menuUrl?: string;
  bookingUrl?: string;
  orderUrl?: string;
  appointmentUrl?: string;
  isVerified?: boolean;
}

export function BusinessProfileCard({
  name,
  category,
  address,
  phone,
  website,
  logoUrl,
  coverPhotoUrl,
  rating,
  reviewCount,
  responseRate,
  healthScore = 0,
  profileCompleteness = 0,
  businessHours,
  menuUrl,
  bookingUrl,
  orderUrl,
  appointmentUrl,
  isVerified,
}: BusinessProfileCardProps) {
  // Get today's hours
  const getTodayHours = () => {
    if (!businessHours) return null;
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const today = days[new Date().getDay()];
    const hours = businessHours[today];
    if (!hours || hours.closed) return "Closed today";
    return `${hours.open} - ${hours.close}`;
  };

  // Check if currently open
  const isOpen = () => {
    if (!businessHours) return null;
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const today = days[new Date().getDay()];
    const hours = businessHours[today];
    if (!hours || hours.closed) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const openTime = parseInt(hours.open.replace(":", ""));
    const closeTime = parseInt(hours.close.replace(":", ""));

    return currentTime >= openTime && currentTime <= closeTime;
  };

  const openStatus = isOpen();
  const todayHours = getTodayHours();

  // Quick links
  const quickLinks = [
    { url: menuUrl, icon: Utensils, label: "Menu" },
    { url: bookingUrl, icon: CalendarCheck, label: "Book" },
    { url: orderUrl, icon: ShoppingBag, label: "Order" },
    { url: appointmentUrl, icon: Calendar, label: "Appointment" },
  ].filter((link) => link.url);

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur overflow-hidden">
      {/* Cover Photo */}
      {coverPhotoUrl && (
        <div className="relative h-32 w-full bg-muted">
          <img
            src={coverPhotoUrl}
            alt={name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        </div>
      )}

      <CardHeader
        className={`pb-3 ${coverPhotoUrl ? "-mt-10 relative z-10" : ""}`}
      >
        <div className="flex items-start gap-4">
          {/* Logo */}
          {logoUrl && (
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-background shadow-lg shrink-0 bg-background">
              <img
                src={logoUrl}
                alt={name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate">{name}</CardTitle>
              {isVerified && (
                <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              )}
            </div>
            {category && (
              <p className="text-sm text-muted-foreground">{category}</p>
            )}

            {/* Rating & Reviews */}
            {(rating || reviewCount) && (
              <div className="flex items-center gap-3 mt-1">
                {rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">{rating}</span>
                  </div>
                )}
                {reviewCount && (
                  <span className="text-sm text-muted-foreground">
                    {reviewCount} reviews
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Open/Closed Badge */}
          {openStatus !== null && (
            <Badge
              variant="outline"
              className={
                openStatus
                  ? "bg-green-500/10 text-green-500 border-green-500/30"
                  : "bg-red-500/10 text-red-500 border-red-500/30"
              }
            >
              {openStatus ? "Open" : "Closed"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4 shrink-0" />
              <span>{phone}</span>
            </div>
          )}
          {website && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-4 h-4 shrink-0" />
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate hover:text-primary transition-colors"
              >
                {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </div>
          )}
          {todayHours && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{todayHours}</span>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10"
          >
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{responseRate || 0}%</p>
            <p className="text-xs text-muted-foreground">Response</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10"
          >
            <MessageSquare className="w-4 h-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{reviewCount || 0}</p>
            <p className="text-xs text-muted-foreground">Reviews</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10"
          >
            {healthScore >= 70 ? (
              <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            )}
            <p className="text-lg font-bold">{healthScore}%</p>
            <p className="text-xs text-muted-foreground">Health</p>
          </motion.div>
        </div>

        {/* Profile Completeness */}
        {profileCompleteness > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Profile Completeness
              </span>
              <span className="font-medium">{profileCompleteness}%</span>
            </div>
            <Progress value={profileCompleteness} className="h-1.5" />
          </div>
        )}

        {/* Quick Links */}
        {quickLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                asChild
              >
                <a href={link.url!} target="_blank" rel="noopener noreferrer">
                  <link.icon className="w-3 h-3 mr-1" />
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
