"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GMBLocation } from "@/lib/types/gmb-types";
import LocationInsightsCard from "./location-insights-card";
import {
  ReviewManagementCardNew,
  PostManagementCardNew,
  QAManagementCardNew,
} from "../shared/management-cards-examples";
import { LocationAICommandCenter } from "./location-ai-command-center";

interface GMBTabsProps {
  location: GMBLocation;
}

const GMBTabs = ({ location }: GMBTabsProps) => {
  return (
    <Tabs defaultValue="command-center" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="command-center">AI Command Center</TabsTrigger>
        <TabsTrigger value="insights">Insights</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="qa">Q&A</TabsTrigger>
      </TabsList>

      <TabsContent value="command-center" className="mt-6">
        <LocationAICommandCenter location={location} />
      </TabsContent>

      <TabsContent value="insights" className="mt-6">
        <LocationInsightsCard location={location} />
      </TabsContent>

      <TabsContent value="reviews" className="mt-6">
        <ReviewManagementCardNew location={location} />
      </TabsContent>

      <TabsContent value="posts" className="mt-6">
        <PostManagementCardNew location={location} />
      </TabsContent>

      <TabsContent value="qa" className="mt-6">
        <QAManagementCardNew location={location} />
      </TabsContent>
    </Tabs>
  );
};

GMBTabs.displayName = "GMBTabs";

export default GMBTabs;
