"use client";

import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Users,
  Target,
} from "lucide-react";
import { useState, useEffect } from "react";

interface BlogPost {
  title: string;
  excerpt: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  image: string;
  featured?: boolean;
}

export default function BlogPage() {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    document.title = "Blog & Insights | NNH - AI Studio";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "Read expert tips, industry trends, and best practices for local business success with Google My Business and AI.",
      );
    }
  }, []);

  const posts: BlogPost[] = [
    {
      title: "10 Strategies to Boost Your Google My Business Rankings in 2025",
      excerpt:
        "Discover the latest techniques to improve your local SEO and stand out in Google search results.",
      author: "Sarah Johnson",
      date: "Nov 15, 2025",
      readTime: "8 min read",
      category: "SEO",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
      featured: true,
    },
    {
      title: "How AI is Transforming Customer Review Management",
      excerpt:
        "Learn how artificial intelligence is revolutionizing the way businesses handle customer feedback.",
      author: "Michael Chen",
      date: "Nov 12, 2025",
      readTime: "6 min read",
      category: "AI",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
      featured: true,
    },
    {
      title: "The Complete Guide to Multi-Location Business Management",
      excerpt:
        "Essential tips for efficiently managing multiple business locations across different markets.",
      author: "Emily Rodriguez",
      date: "Nov 10, 2025",
      readTime: "10 min read",
      category: "Business",
      image:
        "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop",
    },
    {
      title: "5 Ways to Increase Customer Engagement on Google My Business",
      excerpt:
        "Practical strategies to boost interactions and build stronger relationships with your customers.",
      author: "David Kim",
      date: "Nov 8, 2025",
      readTime: "5 min read",
      category: "Marketing",
      image:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop",
    },
    {
      title:
        "Understanding Google My Business Insights: A Data-Driven Approach",
      excerpt:
        "Master the analytics that matter and make data-driven decisions for your business.",
      author: "Lisa Thompson",
      date: "Nov 5, 2025",
      readTime: "7 min read",
      category: "Analytics",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop",
    },
    {
      title:
        "Automating Review Responses: Best Practices and Pitfalls to Avoid",
      excerpt:
        "Learn how to leverage automation while maintaining authentic customer relationships.",
      author: "James Wilson",
      date: "Nov 3, 2025",
      readTime: "6 min read",
      category: "Automation",
      image:
        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop",
    },
  ];

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.category.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const featuredPosts = filteredPosts.filter((post) => post.featured);
  const regularPosts = filteredPosts.filter((post) => !post.featured);

  const categories = Array.from(new Set(posts.map((post) => post.category)));

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "seo":
        return TrendingUp;
      case "ai":
        return Sparkles;
      case "business":
        return Target;
      case "marketing":
        return Users;
      default:
        return BookOpen;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />

          <div className="container mx-auto px-4 max-w-7xl relative">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Blog & Insights
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                Expert tips, industry trends, and best practices for local
                business success
              </p>

              {/* Search & Categories */}
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-background border-border/40"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    All Posts
                  </Badge>
                  {categories.map((category) => {
                    const Icon = getCategoryIcon(category);
                    return (
                      <Badge
                        key={category}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors gap-1"
                      >
                        <Icon className="w-3 h-3" />
                        {category}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Featured Posts */}
            {featuredPosts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Featured Articles
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {featuredPosts.map((post, index) => (
                    <Card
                      key={index}
                      className="border-border/40 bg-card/50 backdrop-blur overflow-hidden hover:border-primary/50 transition-all group cursor-pointer"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur">
                          {post.category}
                        </Badge>
                      </div>
                      <CardContent className="pt-6">
                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {post.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {post.readTime}
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Posts */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Latest Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {regularPosts.map((post, index) => (
                  <Card
                    key={index}
                    className="border-border/40 bg-card/50 backdrop-blur overflow-hidden hover:border-primary/50 transition-all group cursor-pointer"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <Badge className="absolute top-3 left-3 bg-background/90 backdrop-blur text-xs">
                        {post.category}
                      </Badge>
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{post.date}</span>
                        <span>{post.readTime}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* No Results */}
            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No articles found
                </h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or browse all categories
                </p>
              </div>
            )}

            {/* Newsletter CTA */}
            <Card className="border-primary/30 bg-primary/5 mt-12">
              <CardContent className="pt-6 pb-6">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Stay Updated</h3>
                  <p className="text-muted-foreground mb-6">
                    Get the latest articles and insights delivered to your inbox
                    weekly
                  </p>
                  <div className="flex gap-2 max-w-md mx-auto">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      className="bg-background border-border/40"
                    />
                    <button className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap">
                      Subscribe
                    </button>
                  </div>
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
