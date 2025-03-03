import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Carbonly.ai © {new Date().getFullYear()}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Version 1.0.0
          </div>
        </div>
      </div>
    </footer>
  );
}
