import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  Upload,
  Settings,
  Users,
  FileText,
  Droplets,
  Zap,
  Flame,
  Plane,
  Trash2,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    title: "Business",
    href: "/business-units",
    icon: Building2,
  },
  {
    title: "Data Processing",
    href: "/data-processing",
    icon: Upload,
    children: [
      {
        title: "Fuel",
        href: "/fuel-data",
        icon: Flame,
      },
      {
        title: "Water",
        href: "/data-processing/water",
        icon: Droplets,
      },
      {
        title: "Energy",
        href: "/data-processing/energy",
        icon: Zap,
      },
      {
        title: "Travel",
        href: "/data-processing/travel",
        icon: Plane,
      },
      {
        title: "Waste",
        href: "/data-processing/waste",
        icon: Trash2,
      },
    ],
  },
  {
    title: "Teams",
    href: "/users",
    icon: Users,
  },
  {
    title: "Audit Logs",
    href: "/audit-logs",
    icon: FileText,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function MainNav() {
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {navItems.map((item) => (
        <div key={item.href} className="relative group">
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
              "text-muted-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>

          {item.children && (
            <div className="absolute left-0 mt-2 w-48 rounded-md bg-popover shadow-lg ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <child.icon className="h-4 w-4" />
                    {child.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}