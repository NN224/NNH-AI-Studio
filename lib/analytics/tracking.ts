/**
 * Analytics Tracking Service
 * Supports Google Analytics, Plausible, and custom events
 */

// Google Analytics Event
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Track page view
export const trackPageView = (url: string, title?: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", process.env.NEXT_PUBLIC_GA_ID || "", {
      page_path: url,
      page_title: title,
    });
  }
};

// Track form submission
export const trackFormSubmission = (formName: string, success: boolean) => {
  trackEvent(
    success ? "form_submission_success" : "form_submission_error",
    "Forms",
    formName,
  );
};

// Track contact form
export const trackContactForm = (success: boolean) => {
  trackFormSubmission("contact_form", success);
};

// Track newsletter subscription
export const trackNewsletterSubscription = (success: boolean) => {
  trackFormSubmission("newsletter_subscription", success);
};

// Track button click
export const trackButtonClick = (buttonName: string, location: string) => {
  trackEvent("button_click", "Engagement", `${location}:${buttonName}`);
};

// Track link click
export const trackLinkClick = (linkName: string, destination: string) => {
  trackEvent("link_click", "Navigation", `${linkName} -> ${destination}`);
};

// Track search
export const trackSearch = (searchTerm: string, resultCount: number) => {
  trackEvent("search", "Search", searchTerm, resultCount);
};

// Track file download
export const trackDownload = (fileName: string, fileType: string) => {
  trackEvent("download", "Content", `${fileType}:${fileName}`);
};

// Track video play
export const trackVideoPlay = (videoTitle: string) => {
  trackEvent("video_play", "Video", videoTitle);
};

// Track outbound link
export const trackOutboundLink = (url: string) => {
  trackEvent("outbound_link", "Navigation", url);
};

// Track error
export const trackError = (errorMessage: string, errorLocation: string) => {
  trackEvent("error", "Error", `${errorLocation}:${errorMessage}`);
};

// Custom event tracking
export const trackCustomEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, properties);
  }
};
