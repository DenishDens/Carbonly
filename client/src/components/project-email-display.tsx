import { useState } from "react";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Copy, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProjectEmailDisplayProps {
  email: string;
  description?: string;
}

export function ProjectEmailDisplay({ email, description }: ProjectEmailDisplayProps) {
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState<string>();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(email);
    toast({ title: "Email copied to clipboard" });
  };

  const handleShowQR = async () => {
    if (!qrCode) {
      try {
        const code = await QRCode.toDataURL(email);
        setQrCode(code);
      } catch (err) {
        console.error("QR Code generation failed:", err);
        toast({
          title: "Failed to generate QR code",
          variant: "destructive",
        });
        return;
      }
    }
    setShowQR(!showQR);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Project Email Address
        </CardTitle>
        <CardDescription>
          {description || "Forward your data to this email address for automatic processing"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={email} readOnly className="font-mono" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleShowQR}>
              <QrCode className="h-4 w-4" />
            </Button>
          </div>

          {showQR && qrCode && (
            <div className="flex justify-center p-4 bg-muted rounded-lg">
              <img src={qrCode} alt="Project Email QR Code" className="w-48 h-48" />
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <ul className="list-disc list-inside space-y-1">
              <li>Forward bills and data files to this email</li>
              <li>Our AI will automatically process and categorize the data</li>
              <li>Supported formats: PDF, Excel, CSV, images</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
