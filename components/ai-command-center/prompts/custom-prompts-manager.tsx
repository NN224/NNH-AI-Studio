"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Plus,
  Edit,
  Trash,
  Copy,
  Save,
  FileText,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface CustomPrompt {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  category: "general" | "review" | "post" | "qa" | "analysis";
  language: "en" | "ar" | "mixed";
  tone: "professional" | "friendly" | "casual" | "formal";
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function CustomPromptsManager() {
  const [prompts, setPrompts] = useState<CustomPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<CustomPrompt | null>(
    null,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomPrompt>>({
    name: "",
    description: "",
    prompt: "",
    category: "general",
    language: "en",
    tone: "professional",
  });

  useEffect(() => {
    const savedPrompts = localStorage.getItem("customPrompts");
    if (savedPrompts) {
      setPrompts(JSON.parse(savedPrompts));
    }
  }, []);

  const savePrompts = (updatedPrompts: CustomPrompt[]) => {
    setPrompts(updatedPrompts);
    localStorage.setItem("customPrompts", JSON.stringify(updatedPrompts));
  };

  const handleCreate = () => {
    if (!formData.name || !formData.prompt) {
      toast.error("Name and prompt are required");
      return;
    }

    const newPrompt: CustomPrompt = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      prompt: formData.prompt,
      category: formData.category || "general",
      language: formData.language || "en",
      tone: formData.tone || "professional",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPrompts = [...prompts, newPrompt];
    savePrompts(updatedPrompts);
    setIsCreating(false);
    setFormData({
      name: "",
      description: "",
      prompt: "",
      category: "general",
      language: "en",
      tone: "professional",
    });
    toast.success("Prompt created successfully");
  };

  const handleDelete = (id: string) => {
    const prompt = prompts.find((p) => p.id === id);
    if (prompt?.isDefault) {
      toast.error("Cannot delete default prompts");
      return;
    }

    const updatedPrompts = prompts.filter((p) => p.id !== id);
    savePrompts(updatedPrompts);
    toast.success("Prompt deleted");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "review":
        return <MessageSquare className="h-4 w-4" />;
      case "post":
        return <FileText className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-500/20 bg-zinc-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Custom AI Prompts
              </CardTitle>
            </div>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Prompt
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle>Create Custom Prompt</DialogTitle>
                  <DialogDescription>
                    Create a custom AI prompt for specific business needs
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Weekend Special Post"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="review">
                            Review Response
                          </SelectItem>
                          <SelectItem value="post">Post Creation</SelectItem>
                          <SelectItem value="qa">Q&A</SelectItem>
                          <SelectItem value="analysis">Analysis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Language</Label>
                      <Select
                        value={formData.language}
                        onValueChange={(value) =>
                          setFormData({ ...formData, language: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ar">Arabic</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tone</Label>
                      <Select
                        value={formData.tone}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tone: value as any })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Prompt Content</Label>
                    <Textarea
                      value={formData.prompt}
                      onChange={(e) =>
                        setFormData({ ...formData, prompt: e.target.value })
                      }
                      placeholder="Enter your custom prompt..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreate}>
                      <Save className="h-4 w-4 mr-2" />
                      Create Prompt
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prompts.map((prompt) => (
          <Card
            key={prompt.id}
            className="border-zinc-800 bg-zinc-900/50 hover:border-orange-500/30 transition-all cursor-pointer"
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(prompt.category)}
                  <span className="font-medium text-zinc-100">
                    {prompt.name}
                  </span>
                </div>
                {prompt.isDefault && (
                  <Badge variant="outline" className="text-xs">
                    Default
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Badge>{prompt.category}</Badge>
                <Badge variant="outline">{prompt.language.toUpperCase()}</Badge>
                <Badge variant="outline">{prompt.tone}</Badge>
              </div>
              <div className="flex gap-2 pt-2">
                {!prompt.isDefault && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleDelete(prompt.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
