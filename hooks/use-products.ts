import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/components/products/products-manager";
import { toast } from "sonner";

const PRODUCTS_QUERY_KEY = "products";

interface DBProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  image_url: string;
  product_url: string;
  status: "active" | "draft";
}

export function useProducts(locationId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch Products
  const {
    data: products,
    isLoading,
    error,
  } = useQuery({
    queryKey: [PRODUCTS_QUERY_KEY, locationId],
    queryFn: async () => {
      if (!supabase) return [];

      const { data, error } = await supabase
        .from("gmb_products")
        .select("*")
        .eq("location_id", locationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map DB fields to UI fields if necessary
      return (data as unknown as DBProduct[]).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        price: item.price?.toString(),
        currency: item.currency,
        description: item.description,
        imageUrl: item.image_url,
        link: item.product_url,
        status: item.status,
      })) as Product[];
    },
    enabled: !!locationId && !!supabase,
  });

  // Create Product
  const createProduct = useMutation({
    mutationFn: async (newProduct: Omit<Product, "id">) => {
      if (!supabase) throw new Error("Supabase not initialized");

      const { data, error } = await supabase
        .from("gmb_products")
        .insert({
          location_id: locationId,
          name: newProduct.name,
          category: newProduct.category,
          price: parseFloat(newProduct.price),
          currency: newProduct.currency,
          description: newProduct.description,
          image_url: newProduct.imageUrl,
          product_url: newProduct.link,
          status: newProduct.status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PRODUCTS_QUERY_KEY, locationId],
      });
      toast.success("Product created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create product: " + error.message);
    },
  });

  // Update Product
  const updateProduct = useMutation({
    mutationFn: async (product: Product) => {
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("gmb_products")
        .update({
          name: product.name,
          category: product.category,
          price: parseFloat(product.price),
          currency: product.currency,
          description: product.description,
          image_url: product.imageUrl,
          product_url: product.link,
          status: product.status,
        })
        .eq("id", product.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PRODUCTS_QUERY_KEY, locationId],
      });
      toast.success("Product updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update product: " + error.message);
    },
  });

  // Delete Product
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      if (!supabase) throw new Error("Supabase not initialized");

      const { error } = await supabase
        .from("gmb_products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [PRODUCTS_QUERY_KEY, locationId],
      });
      toast.success("Product deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete product: " + error.message);
    },
  });

  return {
    products,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
