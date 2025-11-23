"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  ShoppingBag,
  Tag,
  Link as LinkIcon,
  Image as ImageIcon,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/hooks/use-products";
import { useLocations } from "@/hooks/use-locations";

// Types
export type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  currency: string;
  description: string;
  imageUrl?: string;
  link?: string;
  status: "active" | "draft";
};

export function ProductsManager() {
  const { locations } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");

  // Initialize selectedLocationId when locations are loaded
  if (!selectedLocationId && locations && locations.length > 0) {
    setSelectedLocationId(locations[0].id);
  }

  const locationId = selectedLocationId || locations?.[0]?.id || "";

  const { products, isLoading, createProduct, updateProduct, deleteProduct } =
    useProducts(locationId);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    currency: "USD",
    status: "active",
  });

  // Filter products
  const filteredProducts =
    products?.filter(
      (product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;

    const productData = {
      name: newProduct.name,
      category: newProduct.category || "General",
      price: newProduct.price,
      currency: newProduct.currency || "USD",
      description: newProduct.description || "",
      imageUrl: newProduct.imageUrl,
      link: newProduct.link,
      status: newProduct.status || "active",
    };

    if (editingProduct) {
      await updateProduct.mutateAsync({
        ...editingProduct,
        ...productData,
      } as Product);
    } else {
      await createProduct.mutateAsync(productData as Product);
    }

    setIsAddDialogOpen(false);
    setEditingProduct(null);
    setNewProduct({ currency: "USD", status: "active" });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      category: product.category,
      price: product.price,
      currency: product.currency,
      description: product.description,
      imageUrl: product.imageUrl,
      link: product.link,
      status: product.status,
    });
    setIsAddDialogOpen(true);
  };

  const handleDuplicate = (product: Product) => {
    setEditingProduct(null); // It's a new product
    setNewProduct({
      name: `${product.name} (Copy)`,
      category: product.category,
      price: product.price,
      currency: product.currency,
      description: product.description,
      imageUrl: product.imageUrl,
      link: product.link,
      status: "draft", // Default to draft for copies
    });
    setIsAddDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setNewProduct({ currency: "USD", status: "active" });
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Products
          </h2>
          <p className="text-muted-foreground">
            Manage your product catalog, prices, and inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {locations && locations.length > 1 && (
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            onClick={handleAddNew}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card
            key={product.id}
            className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-zinc-800/50 bg-zinc-900/30"
          >
            <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <ImageIcon className="w-12 h-12 opacity-20" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge
                  variant={
                    product.status === "active" ? "default" : "secondary"
                  }
                  className="capitalize"
                >
                  {product.status}
                </Badge>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {product.category}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -mr-2"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(product)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => deleteProduct.mutate(product.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-zinc-400 line-clamp-2 mb-4 h-10">
                {product.description}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <div className="font-bold text-lg text-primary flex items-center">
                  <span className="text-xs mr-1 text-muted-foreground">
                    {product.currency}
                  </span>
                  {product.price}
                </div>
                {product.link && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    asChild
                  >
                    <a
                      href={product.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add New Card Placeholder */}
        <Button
          variant="outline"
          className="h-full min-h-[300px] flex flex-col items-center justify-center gap-4 border-dashed border-2 hover:border-primary hover:bg-primary/5"
          onClick={handleAddNew}
        >
          <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
            <Plus className="h-6 w-6" />
          </div>
          <span className="font-medium">Add New Product</span>
        </Button>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update product details."
                : "Create a new product to display on your Google Business Profile."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Special"
                  value={newProduct.name || ""}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newProduct.category}
                  onValueChange={(val) =>
                    setNewProduct({ ...newProduct, category: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="digital">Digital Goods</SelectItem>
                    <SelectItem value="physical">Physical Goods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    className="pl-8"
                    placeholder="0.00"
                    value={newProduct.price || ""}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={newProduct.currency}
                  onValueChange={(val) =>
                    setNewProduct({ ...newProduct, currency: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your product..."
                value={newProduct.description || ""}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Product Image URL</Label>
              <Input
                id="image"
                placeholder="https://..."
                value={newProduct.imageUrl || ""}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, imageUrl: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Button Link (Optional)</Label>
              <Input
                id="link"
                placeholder="https://..."
                value={newProduct.link || ""}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, link: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {createProduct.isPending || updateProduct.isPending
                ? "Saving..."
                : editingProduct
                  ? "Update Product"
                  : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
