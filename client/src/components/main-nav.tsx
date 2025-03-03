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
      name: "Incidents",
      href: "/incidents",
    },
    {
      name: "File Processing",
      href: "/file-processing",
    },
    {
      name: "Data",
      href: "/data-processing",
      subItems: [
        { name: "Energy", href: "/data-processing/energy" },
        { name: "Fuel", href: "/data-processing/fuel" }
      ]
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
        isMobile ? "flex-col w-full space-x-0 space-y-2" : "flex-row",
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <div 
          key={item.href} 
          className={cn(
            "relative group w-full",
            isMobile ? "border-b border-border pb-2" : ""
          )}
        >
          <div className="flex items-center justify-between">
            <Link
              href={item.subItems ? "#" : item.href}
              onClick={() => item.subItems && toggleMenu(item.href)}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary flex items-center",
                isMobile ? "w-full py-2 px-4" : "",
                location === item.href
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )}
            >
              {item.name}
              {item.subItems && (
                <ChevronDown className={cn(
                  "ml-1 h-4 w-4 transition-transform",
                  openMenu === item.href && "transform rotate-180"
                )} />
              )}
            </Link>
          </div>

          {item.subItems && (
            <div 
              className={cn(
                isMobile 
                  ? "w-full bg-accent/50 mt-1"
                  : "absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-background border border-border",
                isMobile
                  ? openMenu === item.href ? "block" : "hidden"
                  : "hidden group-hover:block"
              )}
            >
              {item.subItems.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    "block px-4 py-2 text-sm text-foreground hover:bg-accent",
                    location === subItem.href ? "bg-accent" : "",
                    isMobile ? "pl-8" : ""
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