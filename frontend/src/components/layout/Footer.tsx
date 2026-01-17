import { Heart } from "lucide-react";

export function Footer() {
  const domain = window.location.host;

  return (
    <footer className="border-t bg-background/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="font-mono">{domain}</span>
        <span className="flex items-center gap-1">
          Made with <Heart className="h-4 w-4 text-red-500 fill-red-500" /> by{" "}
          <a
            href="https://github.com/victorfrederiknielsen"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Victor Nielsen
          </a>
        </span>
      </div>
    </footer>
  );
}
