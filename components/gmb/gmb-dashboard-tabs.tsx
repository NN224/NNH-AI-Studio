"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GMBLocation } from "@/lib/types/gmb-types";
import LocationInsightsCard from "./location-insights-card";
import ReviewManagementCard from "../reviews/review-management-card";
import PostManagementCard from "../posts/post-management-card";
import QAManagementCard from "../questions/qa-management-card";

interface GMBTabsProps {
  location: GMBLocation;
}

const GMBTabs = ({ location }: GMBTabsProps) => {
  return (
    <Tabs defaultValue="insights" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="insights">Insights</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="posts">Posts</TabsTrigger>
        <TabsTrigger value="qa">Q&A</TabsTrigger>
      </TabsList>
      
      <TabsContent value="insights" className="mt-6">
        <LocationInsightsCard location={location} />
      </TabsContent>
      
      <TabsContent value="reviews" className="mt-6">
        <ReviewManagementCard location={location} />
      </TabsContent>
      
      <TabsContent value="posts" className="mt-6">
        <PostManagementCard location={location} />
      </TabsContent>
      
      <TabsContent value="qa" className="mt-6">
        <QAManagementCard location={location} />
      </TabsContent>
    </Tabs>
  );
};

GMBTabs.displayName = "GMBTabs";

export default GMBTabs;
