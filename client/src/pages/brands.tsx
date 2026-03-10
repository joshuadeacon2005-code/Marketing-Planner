import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ExternalLink, Calendar, Mail, Share2, CheckSquare, Filter, Globe } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import type { Brand, SocialPost, EmailCampaign, Task } from "@shared/schema";

interface BrandRegion {
  brandId: string;
  regionId: string;
}

export default function BrandsPage() {
  const { user } = useAuthStore();
  const [showAllBrands, setShowAllBrands] = useState(false);

  const { data: brands, isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: brandRegions } = useQuery<BrandRegion[]>({
    queryKey: ["/api/brand-regions"],
  });

  const { data: socialPosts } = useQuery<SocialPost[]>({
    queryKey: ["/api/social-posts"],
  });

  const { data: emailCampaigns } = useQuery<EmailCampaign[]>({
    queryKey: ["/api/email-campaigns"],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const getBrandStats = (brandId: string) => {
    const brandPosts = socialPosts?.filter((p) => p.brandId === brandId) || [];
    const brandEmails = emailCampaigns?.filter((e) => e.brandId === brandId) || [];
    const brandTasks = tasks?.filter((t) => t.brandId === brandId) || [];
    
    const now = new Date();
    const scheduledPosts = brandPosts.filter(p => new Date(p.scheduledDate) > now).length;
    const completedTasks = brandTasks.filter(t => t.status === "DONE").length;
    
    return {
      totalPosts: brandPosts.length,
      scheduledPosts,
      totalEmails: brandEmails.length,
      totalTasks: brandTasks.length,
      completedTasks,
    };
  };

  const activeBrands = brands?.filter(b => b.isActive) || [];

  // Get brands assigned to user's region
  const userRegionBrandIds = user?.regionId && brandRegions
    ? brandRegions
        .filter(br => br.regionId === user.regionId)
        .map(br => br.brandId)
    : [];

  // Filter brands based on toggle
  const displayedBrands = showAllBrands || !user?.regionId
    ? activeBrands
    : activeBrands.filter(b => userRegionBrandIds.includes(b.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Brands</h1>
          <p className="text-muted-foreground mt-1">
            {showAllBrands 
              ? "Showing all brands" 
              : "Showing brands assigned to your region"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showAllBrands ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllBrands(!showAllBrands)}
            data-testid="button-toggle-brands-filter"
          >
            {showAllBrands ? (
              <>
                <Globe className="w-4 h-4 mr-2" />
                All Brands
              </>
            ) : (
              <>
                <Filter className="w-4 h-4 mr-2" />
                My Brands
              </>
            )}
          </Button>
          <Badge variant="outline" className="text-sm">
            {displayedBrands.length} Brands
          </Badge>
        </div>
      </div>

      {brandsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayedBrands.map((brand) => {
            const stats = getBrandStats(brand.id);
            return (
              <Link key={brand.id} href={`/brands/${brand.id}`}>
                <Card
                  className="group relative overflow-hidden hover-elevate cursor-pointer transition-all duration-200 hover:shadow-lg h-full"
                  data-testid={`card-brand-${brand.id}`}
                >
                  <div
                    className="h-28 flex items-center justify-center relative"
                    style={{ backgroundColor: brand.color }}
                  >
                    <Package className="w-14 h-14 text-white/80" />
                    {(brand.dreamPimUrl || brand.assetPortalUrl) && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs bg-white/20 text-white border-none">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Links
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-3">{brand.name}</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Share2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{stats.totalPosts} posts</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-purple-500" />
                        <span>{stats.scheduledPosts} scheduled</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 text-amber-500" />
                        <span>{stats.totalEmails} emails</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CheckSquare className="w-3.5 h-3.5 text-green-500" />
                        <span>{stats.completedTasks}/{stats.totalTasks} tasks</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
