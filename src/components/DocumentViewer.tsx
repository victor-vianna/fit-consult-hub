import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
}

export const DocumentViewer = ({
  open,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: DocumentViewerProps) => {
  const isPdf = fileType === "application/pdf" || fileName.endsWith(".pdf");
  const isImage =
    fileType.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{fileName}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={fileUrl} download={fileName}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isPdf ? (
            <iframe
              src={fileUrl}
              sandbox="allow-scripts allow-same-origin" // ✅ Adicione
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "80vh", border: "none" }}
              className="w-full h-full border-0"
              title={fileName}
            />
          ) : isImage ? (
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full h-auto mx-auto"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Visualização não disponível para este tipo de arquivo
                </p>
                <Button asChild>
                  <a href={fileUrl} download={fileName}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar arquivo
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
