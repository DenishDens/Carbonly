import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <a href="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold">Carbonly.ai</span>
            </a>
            <MainNav />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="border-b md:hidden">
            <div className="container py-4">
              <MainNav />
            </div>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}