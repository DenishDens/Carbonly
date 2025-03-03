import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";
import { ChatInterface } from "@/components/chat-interface";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, Leaf, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Organization switching would be implemented here
  const userOrganizations = user?.organizations || [];

  const handleOrgSwitch = async (orgId: number) => {
    // This will be implemented in the next iteration
    console.log("Switching to org:", orgId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <a href="/" className="mr-6 flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Carbonly.ai
              </h1>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.profilePicture} alt={user?.email} />
                      <AvatarFallback>
                        {user?.firstName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userOrganizations.length > 0 && (
                    <>
                      <DropdownMenuLabel>Organizations</DropdownMenuLabel>
                      {userOrganizations.map((org) => (
                        <DropdownMenuItem
                          key={org.id}
                          onClick={() => handleOrgSwitch(org.id)}
                        >
                          <Avatar className="h-5 w-5 mr-2">
                            <AvatarImage src={org.logo} />
                            <AvatarFallback>{org.name[0]}</AvatarFallback>
                          </Avatar>
                          {org.name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <Link href="/profile">
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" />
                      Profile Settings
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Organization Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => logoutMutation.mutate()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

      {/* Chat Interface */}
      <ChatInterface />
    </div>
  );
}