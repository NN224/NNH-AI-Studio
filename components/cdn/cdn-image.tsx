"use client";

import { getCDNUrl, getOptimizedImageUrl } from "@/lib/cdn/config";
import Image, { ImageProps } from "next/image";
import { useState } from "react";

interface CDNImageProps extends Omit<ImageProps, "src"> {
  src: string;
  fallbackSrc?: string;
  optimize?: boolean;
  cdnOptions?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: "webp" | "avif" | "auto";
  };
}

/**
 * Enhanced Image component with CDN support
 */
export function CDNImage({
  src,
  fallbackSrc = "/images/placeholder.jpg",
  optimize = true,
  cdnOptions,
  alt,
  ...props
}: CDNImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  // Get CDN URL
  const cdnUrl = optimize
    ? getOptimizedImageUrl(src, cdnOptions)
    : getCDNUrl(src);

  const handleError = () => {
    console.warn(`Failed to load image: ${imgSrc}`);
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <Image
        {...props}
        src={cdnUrl}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={`${props.className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
      />
    </div>
  );
}

/**
 * Background image with CDN support
 */
export function CDNBackgroundImage({
  src,
  children,
  className = "",
  optimize = true,
  cdnOptions,
}: {
  src: string;
  children?: React.ReactNode;
  className?: string;
  optimize?: boolean;
  cdnOptions?: CDNImageProps["cdnOptions"];
}) {
  const cdnUrl = optimize
    ? getOptimizedImageUrl(src, cdnOptions)
    : getCDNUrl(src);

  return (
    <div
      className={className}
      style={{
        backgroundImage: `url(${cdnUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Lazy loading image with CDN
 */
export function LazyImage({ src, alt, className, ...props }: CDNImageProps) {
  return (
    <CDNImage
      {...props}
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
    />
  );
}
