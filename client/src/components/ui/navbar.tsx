import * as React from "react"
import { Leaf } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"

interface NavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: {
    title: string
    href: string
    icon?: React.ReactNode
  }[]
}

export function Navbar({ className, items = [], ...props }: NavbarProps) {
  const [location] = useLocation()
  const { user } = useAuth()

  return (
    <div className={cn("sticky top-0 z-50 w-full bg-background shadow-sm", className)} {...props}>
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-green-500" />
          <span className="text-xl font-bold text-green-600">Carbonly.ai</span>
        </Link>

        <nav className="flex items-center gap-6">
          {items.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.title}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <span className="text-sm font-medium">{user?.firstName?.[0] || 'U'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Organization Settings</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  )
}