import React from "react";
import { Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full border-t border-border/40 bg-background py-6 md:px-8 md:py-0 mt-auto">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row max-w-7xl mx-auto">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} dkutils. Open Source.
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/gaureshpai/dkutils"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="font-medium text-sm">Contribute on GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
