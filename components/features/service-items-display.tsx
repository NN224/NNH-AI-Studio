import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices, ServiceItem } from "@/hooks/use-services";
import { useLocations } from "@/hooks/use-locations";

export function ServiceItemsDisplay() {
  const { locations } = useLocations();
  const locationId = locations?.[0]?.id || "";

  const { services, isLoading, createService, updateService, deleteService } =
    useServices(locationId);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(
    null,
  );
  const [formData, setFormData] = useState<Partial<ServiceItem>>({
    currency: "USD",
    priceType: "fixed",
  });

  const filteredServices =
    services?.filter(
      (service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const handleSave = async () => {
    if (!formData.name || !formData.category) return;

    try {
      if (editingService) {
        await updateService.mutateAsync({
          id: editingService.id,
          updates: formData,
        });
      } else {
        await createService.mutateAsync(formData);
      }
      setIsAddDialogOpen(false);
      setEditingService(null);
      setFormData({ currency: "USD", priceType: "fixed" });
    } catch (_error) {
      // Error handled by hook
    }
  };

  const handleEdit = (service: ServiceItem) => {
    setEditingService(service);
    setFormData(service);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      await deleteService.mutateAsync(id);
    }
  };

  const openAddDialog = () => {
    setEditingService(null);
    setFormData({ currency: "USD", priceType: "fixed" });
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading services...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredServices.map((service) => (
          <Card key={service.id} className="relative group">
            <CardContent className="p-6">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(service)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => handleDelete(service.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4">
                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded-full">
                  {service.category}
                </span>
              </div>

              <h3 className="font-semibold text-lg mb-2">{service.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {service.description}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <div className="font-medium">
                  {service.priceType === "free" ? (
                    "Free"
                  ) : (
                    <>
                      {service.priceType === "starting_at" && "From "}
                      {service.currency} {service.price}
                    </>
                  )}
                </div>
                {service.duration && (
                  <div className="text-sm text-muted-foreground">
                    {service.duration} min
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Add New Service"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details for your service offering.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category || ""}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingService ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
