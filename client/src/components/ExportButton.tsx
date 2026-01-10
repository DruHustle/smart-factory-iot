import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportButtonProps {
  onExportHtml: () => Promise<{ html: string; filename: string }>;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({
  onExportHtml,
  label = "Export",
  variant = "outline",
  size = "sm",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "html" | "pdf") => {
    setIsExporting(true);
    try {
      const { html, filename } = await onExportHtml();

      if (format === "html") {
        // Download as HTML
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("HTML report downloaded");
      } else {
        // Open in new window for printing to PDF
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          // Add a print button for the user to trigger the PDF download
          const printBtn = printWindow.document.createElement("button");
          printBtn.innerHTML = "Download as PDF";
          printBtn.style.position = "fixed";
          printBtn.style.top = "20px";
          printBtn.style.right = "20px";
          printBtn.style.padding = "10px 20px";
          printBtn.style.backgroundColor = "#f97316";
          printBtn.style.color = "white";
          printBtn.style.border = "none";
          printBtn.style.borderRadius = "5px";
          printBtn.style.cursor = "pointer";
          printBtn.style.fontWeight = "bold";
          printBtn.style.zIndex = "1000";
          printBtn.onclick = () => {
            printBtn.style.display = "none";
            printWindow.print();
            printBtn.style.display = "block";
          };
          printWindow.document.body.appendChild(printBtn);
          toast.success("Report preview opened");
        } else {
          toast.error("Please allow popups to export PDF");
        }
      }
    } catch (error) {
      toast.error("Failed to generate report");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("html")}>
          <FileText className="h-4 w-4 mr-2" />
          Export as HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple export button for direct download
export function SimpleExportButton({
  onClick,
  label = "Export",
  isLoading = false,
  variant = "outline",
  size = "sm",
}: {
  onClick: () => void;
  label?: string;
  isLoading?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  return (
    <Button variant={variant} size={size} onClick={onClick} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
