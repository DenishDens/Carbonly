import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown } from "lucide-react";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

export function MainNav({ className, ...props }: MainNavProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
    },
    {
      name: "Business Units",
      href: "/business-units",
    },
    {
      name: "Data",
      href: "/data",
      subItems: [
        { name: "Scope 1 Emissions", href: "/data/scope-1" },
        { name: "Scope 2 Emissions", href: "/data/scope-2" },
        { name: "Scope 3 Emissions", href: "/data/scope-3" }
      ]
    },
    {
      name: "Incidents",
      href: "/incidents",
    },
    {
      name: "Reports",
      href: "/reports",
    },
    {
      name: "Settings",
      href: "/settings",
    },
  ];

  const toggleMenu = (href: string) => {
    setOpenMenu(openMenu === href ? null : href);
  };

  return (
    <nav
      className={cn(
        "flex items-center space-x-4",
        isMobile ? "flex-col w-full space-x-0" : "flex-row",
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <div 
          key={item.href} 
          className={cn(
            "relative group w-full",
            isMobile && "border-b border-border/20 last:border-0"
          )}
        >
          <div className={cn(
            "flex items-center justify-between",
            isMobile ? "px-4 py-2.5" : "px-2"
          )}>
            <Link
              href={item.subItems ? "#" : item.href}
              onClick={() => item.subItems && toggleMenu(item.href)}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
                location === item.href
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {item.name}
              {item.subItems && (
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  openMenu === item.href && "transform rotate-180"
                )} />
              )}
            </Link>
          </div>

          {item.subItems && (
            <div 
              className={cn(
                "overflow-hidden transition-all duration-200",
                isMobile 
                  ? "w-full bg-accent/10"
                  : "absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-background border border-border",
                isMobile
                  ? openMenu === item.href ? "max-h-40" : "max-h-0"
                  : "hidden group-hover:block"
              )}
            >
              {item.subItems.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    "block px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors",
                    location === subItem.href && "bg-accent/40 text-primary font-medium",
                    isMobile && "pl-8"
                  )}
                >
                  {subItem.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}