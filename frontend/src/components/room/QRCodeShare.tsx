import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Copy, Globe, Maximize2, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useCallback, useRef, useState } from "react";

interface QRCodeShareProps {
  url: string;
}

export function QRCodeShare({ url }: QRCodeShareProps) {
  const [copied, setCopied] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const fullscreenQrRef = useRef<HTMLCanvasElement>(null);

  const copyAsPng = useCallback(
    async (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) return;

        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy QR code:", error);
      }
    },
    [],
  );

  const openFullscreen = useCallback(() => {
    setPopoverOpen(false);
    setFullscreenOpen(true);
  }, []);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted hover:bg-accent transition-colors"
          >
            <QrCode className="h-3.5 w-3.5 text-neutral-500" />
            <span className="sr-only">Show QR code</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <h3 className="text-sm font-medium">Room QR code</h3>
            <button
              type="button"
              onClick={openFullscreen}
              className="p-1.5 rounded-md hover:bg-accent transition-colors font-ui"
              title="Full screen"
            >
              <Maximize2 className="h-4 w-4 text-neutral-500" />
              <span className="sr-only">Full screen</span>
            </button>
          </div>
          <div className="flex flex-col items-center gap-4 px-6 pb-6">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <QRCodeCanvas
                ref={qrRef}
                value={url}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                marginSize={2}
              />
            </a>
            <button
              type="button"
              onClick={() => copyAsPng(qrRef)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium font-ui rounded-md bg-muted hover:bg-accent transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy as PNG
                </>
              )}
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Join this room</DialogTitle>
            <DialogDescription>
              Scan the QR code with your phone or tablet to join the estimation
              session on another device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden hover:opacity-90 transition-opacity shadow-lg"
            >
              <QRCodeCanvas
                ref={fullscreenQrRef}
                value={url}
                size={280}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                marginSize={3}
              />
            </a>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Or visit this link directly:
            </p>
            <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md max-w-full">
              <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
              <code className="text-xs break-all">{url}</code>
            </div>
            <button
              type="button"
              onClick={() => copyAsPng(fullscreenQrRef)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium font-ui rounded-md bg-muted hover:bg-accent transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy QR as PNG
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
