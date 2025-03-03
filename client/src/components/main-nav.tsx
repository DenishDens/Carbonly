import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  Upload,
  Settings,
  Users,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
    href: "/file-processing",
    icon: Upload,
  },
  {
    title: "Teams",
    href: "/users",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function MainNav() {
  return (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "cursor-pointer"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}