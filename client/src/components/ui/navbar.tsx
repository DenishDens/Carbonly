
import * as React from "react"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Link, useLocation } from "react-router-dom"

interface NavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: {
    title: string
    href: string
    icon?: React.ReactNode
  }[]
}

export function Navbar({ className, items = [], ...props }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const location = useLocation()

  return (
    <div className={cn("sticky top-0 z-50 w-full bg-background shadow-sm", className)} {...props}>
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">Carbonly.ai</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {items.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
        
        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] sm:w-[300px]">
            <nav className="flex flex-col gap-4 mt-8">
              {items.map((item, index) => (
                <Link
                  key={index}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    location.pathname === item.href ? "bg-accent" : "transparent"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
