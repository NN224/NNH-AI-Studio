'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  FileBarChart,
  Download,
  Save,
  Play,
  Settings,
  Plus,
  X,
  Calendar,
  MapPin,
  TrendingUp,
  BarChart3,
  LineChart,
  PieChart,
  Table
} from 'lucide-react';
import { AnalyticsFilters, type AnalyticsFilters as FiltersType } from './analytics-filters';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  metrics: string[];
  dimensions: string[];
  visualization: 'table' | 'bar' | 'line' | 'pie';
  filters: FiltersType;
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

const AVAILABLE_METRICS = [
  { value: 'impressions', label: 'Impressions', category: 'visibility' },
  { value: 'clicks', label: 'Clicks', category: 'engagement' },
  { value: 'calls', label: 'Phone Calls', category: 'engagement' },
  { value: 'directions', label: 'Direction Requests', category: 'engagement' },
  { value: 'website_visits', label: 'Website Visits', category: 'engagement' },
  { value: 'reviews_count', label: 'Reviews Count', category: 'reputation' },
  { value: 'avg_rating', label: 'Average Rating', category: 'reputation' },
  { value: 'response_rate', label: 'Response Rate', category: 'reputation' },
  { value: 'questions_count', label: 'Questions Count', category: 'engagement' },
  { value: 'posts_count', label: 'Posts Count', category: 'content' },
  { value: 'photos_count', label: 'Photos Count', category: 'content' }
];

const AVAILABLE_DIMENSIONS = [
  { value: 'location', label: 'Location' },
  { value: 'date', label: 'Date' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'dayOfWeek', label: 'Day of Week' },
  { value: 'hour', label: 'Hour of Day' }
];

interface CustomReportBuilderProps {
  onReportGenerate?: (config: ReportConfig) => void;
  savedReports?: ReportConfig[];
}

export function CustomReportBuilder({ 
  onReportGenerate,
  savedReports = []
}: CustomReportBuilderProps) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [reportName, setReportName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['location']);
  const [visualization, setVisualization] = useState<ReportConfig['visualization']>('table');
  const [filters, setFilters] = useState<FiltersType>({
    dateRange: {
      preset: '30',
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    },
    locationIds: [],
    comparison: 'none',
    metric: 'all'
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const supabase = createClient();

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const handleDimensionToggle = (dimension: string) => {
    setSelectedDimensions(prev => 
      prev.includes(dimension)
        ? prev.filter(d => d !== dimension)
        : [...prev, dimension]
    );
  };

  const generateReport = async () => {
    if (!reportName.trim()) {
      toast.error('Please enter a report name');
      return;
    }

    if (selectedMetrics.length === 0) {
      toast.error('Please select at least one metric');
      return;
    }

    setIsBuilding(true);

    try {
      const reportConfig: ReportConfig = {
        id: `report-${Date.now()}`,
        name: reportName,
        metrics: selectedMetrics,
        dimensions: selectedDimensions,
        visualization,
        filters,
        schedule: scheduleEnabled ? {
          enabled: true,
          frequency: scheduleFrequency,
          recipients: [] // TODO: Add recipient management
        } : undefined
      };

      // Save report configuration
      const { error } = await supabase
        .from('custom_reports')
        .insert({
          name: reportConfig.name,
          config: reportConfig,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('Report created successfully');
      onReportGenerate?.(reportConfig);
      
      // Reset form
      setReportName('');
      setSelectedMetrics([]);
      setSelectedDimensions(['location']);
      setScheduleEnabled(false);

    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to create report');
    } finally {
      setIsBuilding(false);
    }
  };

  const exportReport = async (format: 'excel' | 'pdf' | 'csv') => {
    // This would fetch the actual data and export it
    // For demo purposes, showing the implementation structure
    
    try {
      const { data: reportData } = await supabase
        .from('gmb_performance_metrics')
        .select('*')
        .in('location_id', filters.locationIds)
        .gte('metric_date', filters.dateRange.from.toISOString())
        .lte('metric_date', filters.dateRange.to.toISOString());

      if (!reportData) {
        toast.error('No data to export');
        return;
      }

      switch (format) {
        case 'excel': {
          const ws = XLSX.utils.json_to_sheet(reportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Report');
          XLSX.writeFile(wb, `${reportName || 'report'}_${Date.now()}.xlsx`);
          break;
        }
        case 'csv': {
          const ws = XLSX.utils.json_to_sheet(reportData);
          const csv = XLSX.utils.sheet_to_csv(ws);
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${reportName || 'report'}_${Date.now()}.csv`;
          a.click();
          break;
        }
        case 'pdf': {
          // Would need to render chart/table to canvas first
          toast.info('PDF export coming soon');
          break;
        }
      }

      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const getVisualizationIcon = (type: string) => {
    switch (type) {
      case 'bar': return BarChart3;
      case 'line': return LineChart;
      case 'pie': return PieChart;
      default: return Table;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Custom Report Builder
          </CardTitle>
          <CardDescription>
            Build custom reports with your preferred metrics and visualizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Name */}
          <div className="space-y-2">
            <Label htmlFor="report-name">Report Name</Label>
            <Input
              id="report-name"
              placeholder="Monthly Performance Summary"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>

          {/* Metrics Selection */}
          <div className="space-y-2">
            <Label>Select Metrics</Label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {AVAILABLE_METRICS.map(metric => (
                <label
                  key={metric.value}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.value)}
                    onChange={() => handleMetricToggle(metric.value)}
                    className="rounded border-primary/50"
                  />
                  <span className="text-sm">{metric.label}</span>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {metric.category}
                  </Badge>
                </label>
              ))}
            </div>
          </div>

          {/* Dimensions Selection */}
          <div className="space-y-2">
            <Label>Group By</Label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {AVAILABLE_DIMENSIONS.map(dimension => (
                <label
                  key={dimension.value}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-lg"
                >
                  <input
                    type="checkbox"
                    checked={selectedDimensions.includes(dimension.value)}
                    onChange={() => handleDimensionToggle(dimension.value)}
                    className="rounded border-primary/50"
                  />
                  <span className="text-sm">{dimension.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Visualization Type */}
          <div className="space-y-2">
            <Label>Visualization Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {(['table', 'bar', 'line', 'pie'] as const).map(type => {
                const Icon = getVisualizationIcon(type);
                return (
                  <Button
                    key={type}
                    variant={visualization === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVisualization(type)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <Label>Report Filters</Label>
            <AnalyticsFilters
              onFiltersChange={setFilters}
              defaultDateRange="30"
            />
          </div>

          {/* Schedule Settings */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="schedule-enabled">Schedule Report</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically generate and send this report
                </p>
              </div>
              <Switch
                id="schedule-enabled"
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
              />
            </div>
            
            {scheduleEnabled && (
              <div className="space-y-2 pl-4">
                <Label htmlFor="schedule-frequency">Frequency</Label>
                <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as any)}>
                  <SelectTrigger id="schedule-frequency" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={generateReport}
              disabled={isBuilding || !reportName.trim() || selectedMetrics.length === 0}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Generate Report
            </Button>
            
            <Button
              variant="outline"
              onClick={() => exportReport('excel')}
              disabled={!reportName.trim() || selectedMetrics.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
            
            <Button
              variant="outline"
              onClick={() => exportReport('csv')}
              disabled={!reportName.trim() || selectedMetrics.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Reports */}
      {savedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Saved Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedReports.map(report => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileBarChart className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{report.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.metrics.length} metrics • {report.dimensions.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.schedule?.enabled && (
                      <Badge variant="secondary" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.schedule.frequency}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReportGenerate?.(report)}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
