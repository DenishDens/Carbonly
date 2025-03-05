import * as React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

export function MainNav({ className, ...props }: MainNavProps) {
  const [location] = useLocation();

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
      name: "Data Entry",
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
  ];

  return (
    <nav
      className={cn("flex items-center gap-4", className)}
      {...props}
    >
      {navItems.map((item) => (
        <div key={item.href} className="relative group">
          <Link
            href={item.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              location === item.href
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            )}
          >
            {item.name}
          </Link>
          {item.subItems && (
            <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-background border border-border hidden group-hover:block">
              {item.subItems.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    "block px-4 py-2 text-sm text-foreground hover:bg-accent",
                    location === subItem.href ? "bg-accent" : ""
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