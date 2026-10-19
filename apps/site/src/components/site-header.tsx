'use client';

import { Button } from '@comet/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@comet/ui/components/dialog';
import { Menu, Star } from 'lucide-react';
import { useEffect, useState, type ReactElement } from 'react';

const navigation = [
  { href: '/features/', label: 'Features' },
  { href: '/docs/', label: 'Docs' },
  { href: 'https://github.com/Thavarshan/comet/issues', label: 'Support' },
] as const;

/** Match the reference's quiet sticky header and accessible mobile sheet. */
export function SiteHeader(): ReactElement {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const updateScroll = (): void => setScrolled(window.scrollY > 10);

    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });

    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  return (
    <header className="site-header" data-scrolled={scrolled}>
      <div className="site-container header-inner">
        <a className="brand" href="/" aria-label="Comet home">
          <img src="/logo.svg" alt="" width="32" height="32" />
          <span>Comet</span>
        </a>
        <nav className="site-navigation" aria-label="Main navigation">
          {navigation.map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm">
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
          <Button asChild variant="outline" className="github-button" size="sm">
            <a href="https://github.com/Thavarshan/comet">
              <Star aria-hidden="true" /> Star on GitHub
            </a>
          </Button>
          <Button asChild size="sm" className="site-button">
            <a href="/download/">Download</a>
          </Button>
        </nav>
        <div className="mobile-navigation">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent className="site-menu" closeLabel="Close menu">
              <DialogTitle className="brand">Comet</DialogTitle>
              <DialogDescription className="sr-only">
                Explore Comet, get help, or choose a desktop download.
              </DialogDescription>
              <nav aria-label="Mobile navigation">
                {navigation.map((link) => (
                  <DialogClose key={link.href} asChild>
                    <a href={link.href}>{link.label}</a>
                  </DialogClose>
                ))}
                <DialogClose asChild>
                  <a href="/download/" className="site-button">
                    Download
                  </a>
                </DialogClose>
                <a href="https://github.com/Thavarshan/comet">
                  <Star aria-hidden="true" /> Star on GitHub
                </a>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
