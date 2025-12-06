import React from 'react';
import { Github, Globe, Linkedin } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full border-t border-border/40 bg-background py-6 md:px-8 md:py-0 mt-auto">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row max-w-7xl mx-auto">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} Utility Hub. All rights reserved. Built by{" "}
          <a
            href="https://gauresh.is-a.dev"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Gauresh Pai
          </a>
          .
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="https://github.com/gaureshpai"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            to="https://gauresh.is-a.dev"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Globe className="h-5 w-5" />
            <span className="sr-only">Website</span>
          </Link>
          <Link
            to="https://linkedin.com/in/gaureshpai"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Linkedin className="h-5 w-5" />
            <span className="sr-only">LinkedIn</span>
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;