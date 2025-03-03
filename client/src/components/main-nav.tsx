import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

export function MainNav({ className, ...props }: MainNavProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
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
      name: "Data Entry",
      href: "/file-processing",
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

  return (
    <nav
      className={cn(
        "flex items-center gap-4",
        isMobile ? "w-full flex-col" : "flex-row",
        className
      )}
      {...props}
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            isMobile ? "w-full py-2" : "",
            location === item.href
              ? "text-primary font-semibold"
              : "text-muted-foreground"
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}