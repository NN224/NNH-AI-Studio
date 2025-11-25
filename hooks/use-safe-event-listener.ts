import { useEffect, useRef } from "react";

type EventHandler<K extends keyof WindowEventMap> = (
  event: WindowEventMap[K],
) => void;
type ElementEventHandler<K extends keyof HTMLElementEventMap> = (
  event: HTMLElementEventMap[K],
) => void;
type DocumentEventHandler<K extends keyof DocumentEventMap> = (
  event: DocumentEventMap[K],
) => void;

/**
 * Hook to safely add window event listeners with automatic cleanup
 */
export function useWindowEventListener<K extends keyof WindowEventMap>(
  eventType: K,
  handler: EventHandler<K>,
  options?: boolean | AddEventListenerOptions,
) {
  const savedHandler = useRef<EventHandler<K>>();

  // Update handler ref on each render
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Make sure element supports addEventListener
    if (!window?.addEventListener) return;

    // Create event listener that calls handler function stored in ref
    const eventListener = (event: WindowEventMap[K]) =>
      savedHandler.current?.(event);

    // Add event listener
    window.addEventListener(eventType, eventListener as EventListener, options);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener(
        eventType,
        eventListener as EventListener,
        options,
      );
    };
  }, [eventType, options]);
}

/**
 * Hook to safely add document event listeners with automatic cleanup
 */
export function useDocumentEventListener<K extends keyof DocumentEventMap>(
  eventType: K,
  handler: DocumentEventHandler<K>,
  options?: boolean | AddEventListenerOptions,
) {
  const savedHandler = useRef<DocumentEventHandler<K>>();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!document?.addEventListener) return;

    const eventListener = (event: DocumentEventMap[K]) =>
      savedHandler.current?.(event);
    document.addEventListener(
      eventType,
      eventListener as EventListener,
      options,
    );

    return () => {
      document.removeEventListener(
        eventType,
        eventListener as EventListener,
        options,
      );
    };
  }, [eventType, options]);
}

/**
 * Hook to safely add element event listeners with automatic cleanup
 */
export function useEventListener<
  K extends keyof HTMLElementEventMap,
  T extends HTMLElement = HTMLElement,
>(
  eventType: K,
  handler: ElementEventHandler<K>,
  element: T | null | undefined,
  options?: boolean | AddEventListenerOptions,
) {
  const savedHandler = useRef<ElementEventHandler<K>>();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element?.addEventListener) return;

    const eventListener = (event: HTMLElementEventMap[K]) =>
      savedHandler.current?.(event);
    element.addEventListener(
      eventType,
      eventListener as EventListener,
      options,
    );

    return () => {
      element.removeEventListener(
        eventType,
        eventListener as EventListener,
        options,
      );
    };
  }, [eventType, element, options]);
}

/**
 * Hook to manage multiple event listeners
 */
export function useEventListeners<T extends HTMLElement = HTMLElement>(
  element: T | null | undefined,
  listeners: Array<{
    type: keyof HTMLElementEventMap;
    handler: (event: Event) => void;
    options?: boolean | AddEventListenerOptions;
  }>,
) {
  const savedListeners = useRef(listeners);

  useEffect(() => {
    savedListeners.current = listeners;
  }, [listeners]);

  useEffect(() => {
    if (!element?.addEventListener) return;

    const eventListeners: Array<{
      type: string;
      listener: (event: Event) => void;
      options?: boolean | AddEventListenerOptions;
    }> = [];

    savedListeners.current.forEach(({ type, handler, options }) => {
      const listener = (event: Event) => handler(event);
      element.addEventListener(type, listener, options);
      eventListeners.push({ type, listener, options });
    });

    return () => {
      eventListeners.forEach(({ type, listener, options }) => {
        element.removeEventListener(type, listener, options);
      });
    };
  }, [element]);
}

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof window !== "undefined" ? navigator.onLine : true,
  );

  useWindowEventListener("online", () => setIsOnline(true));
  useWindowEventListener("offline", () => setIsOnline(false));

  return isOnline;
}

/**
 * Hook to track page visibility
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = React.useState(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );

  useDocumentEventListener("visibilitychange", () => {
    setIsVisible(document.visibilityState === "visible");
  });

  return isVisible;
}

// Add missing React import
import React from "react";
