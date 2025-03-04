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
import { Footer } from "@/components/footer";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <div className="flex items-center md:mr-4">
            <a href="/" className="mr-4 md:mr-6 flex items-center gap-2">
              <Leaf className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Carbonly.ai
              </h1>
            </a>
            <div className="hidden md:flex">
              <MainNav />
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
            <nav className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
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

        {showMobileMenu && (
          <div className="border-b md:hidden">
            <div className="container py-3">
              <MainNav className="flex flex-col space-y-2" />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 container mx-auto px-3 md:px-4 py-4 md:py-8">
        {children}
      </main>

      <Footer />

      {/* Position the chat interface in the bottom right corner, away from content */}
      <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
        <div className="pointer-events-auto">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}