import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  FileText,
  BarChart3,
  Building2,
  Upload,
  Settings,
  Users,
  Shield,
  Plug,
  AlertTriangle,
  FileCheck,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    title: "Business Units",
    href: "/business-units",
    icon: Building2,
  },
  {
    title: "File Processing",
    href: "/file-processing",
    icon: Upload,
  },
  {
    title: "Emissions Data",
    href: "/emissions",
    icon: FileText,
  },
  {
    title: "Integrations",
    href: "/integrations",
    icon: Plug,
    disabled: true, // Phase 2 feature
  },
  {
    title: "Environmental Incidents",
    href: "/incidents",
    icon: AlertTriangle,
    disabled: true, // Future feature
  },
  {
    title: "Governance & ESG",
    href: "/governance",
    icon: Shield,
    disabled: true, // Future feature
  },
  {
    title: "Audit & Compliance",
    href: "/audit",
    icon: FileCheck,
    disabled: true, // Future feature
  },
  {
    title: "User Management",
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
          href={item.disabled ? "#" : item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            item.disabled && "pointer-events-none opacity-60",
            !item.disabled && "cursor-pointer"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
