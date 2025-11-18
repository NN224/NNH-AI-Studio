import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

// Filters Component
export const LocationsFilters = ({ 
  searchTerm, 
  onSearchChange, 
  selectedStatus, 
  onStatusChange, 
  selectedCategory, 
  onCategoryChange, 
  categories 
}: {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
}) => {

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('filters.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select onValueChange={onStatusChange} value={selectedStatus}>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder={t('filters.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
              <SelectItem value="verified">{t('filters.verified')}</SelectItem>
              <SelectItem value="pending">{t('filters.pending')}</SelectItem>
              <SelectItem value="suspended">{t('filters.suspended')}</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={onCategoryChange} value={selectedCategory}>
            <SelectTrigger className="md:w-[180px]">
              <SelectValue placeholder={t('filters.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};