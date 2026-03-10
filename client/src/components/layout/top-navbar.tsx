import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Share2,
  Mail,
  Calendar,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Archive,
  FolderOpen,
  FolderKanban,
  SendHorizontal,
  CheckCircle2,
} from "lucide-react";
import bloomGrowLogo from "@assets/image_1768465475048.png";
import { useAuthStore } from "@/lib/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notification-bell";
import type { Brand } from "@shared/schema";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Queue", url: "/publishing-queue", icon: SendHorizontal },
  { title: "Published", url: "/published", icon: CheckCircle2 },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Assets", url: "/assets", icon: FolderOpen },
  { title: "Archive", url: "/sent", icon: Archive },
];

const adminNavItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function TopNavbar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const activeBrands = brands?.filter(b => b.isActive) || [];

  const handleLogout = () => {
    logout();
  };

  const isAdmin = user?.role === "ADMIN";
  const allNavItems = isAdmin ? [...mainNavItems, ...adminNavItems] : mainNavItems;

  const isBrandPage = location.startsWith("/brands");

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <Link
              href="/"
              className="flex flex-col items-center hover:opacity-80 transition-opacity flex-shrink-0"
              data-testid="link-logo"
            >
              <img 
                src={bloomGrowLogo} 
                alt="Bloom & Grow" 
                className="h-14 w-auto object-contain"
              />
              <span className="text-xs uppercase tracking-[0.25em] text-primary font-bold mt-0.5">Marketing</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1 flex-wrap">
              {allNavItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <Link
                    key={item.title}
                    href={item.url}
                    className="nav-hover-item group"
                    data-active={isActive || undefined}
                    data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="nav-hover-text">
                      <item.icon className="w-3.5 h-3.5" />
                      {item.title}
                    </span>
                    <span className="nav-hover-border" />
                    <span className="nav-hover-fill" />
                  </Link>
                );
              })}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="nav-hover-item group"
                    data-active={isBrandPage || undefined}
                    data-testid="nav-brands-dropdown"
                  >
                    <span className="nav-hover-text">
                      <Building2 className="w-3.5 h-3.5" />
                      Brands
                      <ChevronDown className="w-3 h-3" />
                    </span>
                    <span className="nav-hover-border" />
                    <span className="nav-hover-fill" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setLocation("/brands")}
                    className="flex items-center gap-2 cursor-pointer font-medium"
                    data-testid="nav-all-brands"
                  >
                    <Building2 className="w-3 h-3" />
                    <span>View All Brands</span>
                  </DropdownMenuItem>
                  {activeBrands.length > 0 && (
                    <div className="border-t my-1" />
                  )}
                  {activeBrands.map((brand) => (
                    <DropdownMenuItem
                      key={brand.id}
                      onClick={() => setLocation(`/brands/${brand.id}`)}
                      className="flex items-center gap-2 cursor-pointer"
                      data-testid={`nav-brand-${brand.id}`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: brand.color }}
                      />
                      <span>{brand.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2" data-testid="button-user-menu">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary text-primary-foreground font-medium text-xs">
                      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-foreground">{user?.name?.split(' ')[0] || 'User'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium" data-testid="text-user-name">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground" data-testid="text-user-email">{user?.email || ''}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-3 space-y-1">
            {allNavItems.map((item) => {
              const isActive = location === item.url;
              return (
                <Button
                  key={item.title}
                  variant="ghost"
                  asChild
                  className={`w-full justify-start gap-3 ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link
                    href={item.url}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`nav-mobile-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                </Button>
              );
            })}

            <div className="py-2">
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Brands</p>
              {activeBrands.map((brand) => (
                <Button
                  key={brand.id}
                  variant="ghost"
                  asChild
                  className={`w-full justify-start gap-3 ${
                    location === `/brands/${brand.id}`
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Link
                    href={`/brands/${brand.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`nav-mobile-brand-${brand.id}`}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: brand.color }}
                    />
                    <span className="font-medium">{brand.name}</span>
                  </Link>
                </Button>
              ))}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}
