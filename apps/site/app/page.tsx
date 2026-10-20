import { Badge } from '@honeymelon/ui/components/badge';
import { Button } from '@honeymelon/ui/components/button';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { ReactElement } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '../src/lib/metadata';

/** Describe today's desktop product, independently of the visual reference. */
export const metadata: Metadata = pageMetadata(
  '/',
  'Local media converter',
  'Convert video, audio and images locally with Honeymelon desktop for macOS, Windows and Linux. Explore downloads, guides and source code.',
);

const proofPoints = [
  [
    'Made for your desktop',
    'Published packages for macOS, Windows and Linux. Choose the right build for your computer.',
  ],
  [
    'Free & open source',
    'Inspect the code, contribute improvements, or make it your own. Honeymelon is MIT licensed.',
  ],
  [
    'Your files stay local',
    'Media conversion runs on your device. No conversion account or media upload is required.',
  ],
  [
    'One simple workflow',
    'Video, audio and images share a clear queue, familiar controls and local output folders.',
  ],
] as const;

const featureGroups = [
  {
    icon: Zap,
    title: 'Performance',
    features: [
      [
        'Local conversion engine',
        'Bundled media tools process files on your computer.',
      ],
      [
        'Batch processing',
        'Add multiple files and let the queue work through them.',
      ],
      [
        'Progress you can follow',
        'See each conversion progress and cancel when needed.',
      ],
    ],
  },
  {
    icon: Settings2,
    title: 'Control',
    features: [
      ['Quality options', 'Choose the output settings that suit your files.'],
      ['Format flexibility', 'Video, audio and image formats in one place.'],
      ['Your output folder', 'Save converted files where you want them.'],
    ],
  },
  {
    icon: Sparkles,
    title: 'Simplicity',
    features: [
      ['Drag & drop', 'Bring files straight into your conversion queue.'],
      ['A focused interface', 'Everything you need, without the clutter.'],
      ['Five languages', 'English, Spanish, French, German and Russian.'],
    ],
  },
] as const;

const steps = [
  [
    '01',
    'Drop Your Files',
    'Add video, audio or image files to the queue. Keep your originals safe on your computer.',
  ],
  [
    '02',
    'Choose Your Output',
    'Select a supported format, adjust the settings and choose a destination folder.',
  ],
  [
    '03',
    'Convert Locally',
    'Start your batch, follow its progress and find the completed files in your chosen folder.',
  ],
] as const;

const showcases = [
  {
    title: 'Effortless Queue Management',
    description:
      'Pending, active and completed conversions, together in one clean interface. Work through a batch with confidence.',
    points: [
      'Per-file progress tracking',
      'Batch conversion controls',
      'Cancel, clear and retry',
    ],
    image: 'desktop-light',
    alt: 'Honeymelon 3.0 beta queue with completed video conversions',
  },
  {
    title: 'Beautiful in Any Light',
    description:
      'Choose light, dark or system appearance. A compact desktop utility that feels comfortable throughout your day.',
    points: [
      'Automatic system theme',
      'Explicit light and dark choices',
      'A focused, resizable window',
    ],
    image: 'desktop-dark',
    alt: 'Honeymelon 3.0 beta desktop conversion queue in dark mode',
  },
  {
    title: 'Your Files. Your Settings.',
    description:
      'Choose an output format, fine-tune the available quality controls and pick where the results go.',
    points: [
      'Format and codec options',
      'Media-specific quality controls',
      'Custom destination folders',
    ],
    image: 'output-settings',
    alt: 'Honeymelon 3.0 beta format, quality and destination settings',
  },
] as const;

const highlights = [
  'Free to use — no license keys or activation',
  'MIT licensed — explore and contribute to the source',
  'Local processing — no media upload required',
  'No account needed to convert your files',
  'Desktop packages for macOS, Windows and Linux',
  'Community-driven development',
] as const;

const faqs = [
  [
    'Is Honeymelon really free?',
    'Yes. Honeymelon is free and open source under the MIT license. There are no subscription fees, license keys or conversion accounts. Bundled media tools have their own license notices.',
  ],
  [
    'Which operating systems are supported?',
    'Published desktop packages are available for macOS, Windows and Linux. Availability varies by release and processor. The download page lists exact verified packages; check the original release notes before installing.',
  ],
  [
    'Does Honeymelon work offline?',
    'Media conversion happens on your computer using bundled tools. An internet connection is needed to download Honeymelon, but your media does not need to be uploaded for conversion.',
  ],
  [
    'What file formats are supported?',
    'Honeymelon works with video, audio and images, including common formats such as MP4, MP3, JPEG and PNG. Available outputs and codecs depend on the platform and release. Not every input can become every output.',
  ],
  [
    'Do you upload my files?',
    'No media upload is required by the desktop conversion workflow. The website hosting provider may process ordinary access logs; read our privacy page for details.',
  ],
  [
    'What should I know about the 3.0 beta?',
    'The 3.0 beta is explicitly unsigned and may trigger operating-system trust warnings. The screenshots on this page show that beta. Stable downloads remain separate; read the release notes and verify published checksums.',
  ],
  [
    'How can I contribute?',
    'Report a reproducible bug, improve documentation, contribute a translation or propose a code change on GitHub. Private media should not be attached to public issue reports.',
  ],
] as const;

/** Keep the reference's section rhythm while rendering complete static HTML. */
export default function HomePage(): ReactElement {
  return (
    <main id="main-content" className="home-main" tabIndex={-1}>
      <section id="hero" className="hero" aria-labelledby="hero-heading">
        <div className="site-container">
          <div className="hero-copy">
            <Badge variant="outline" className="hero-badge">
              <img src="/logo.svg" alt="" width="16" height="16" />
              Desktop App <span aria-hidden="true">·</span> Local Conversion
            </Badge>
            <h1 id="hero-heading">
              Smart Media Conversion
              <br />
              <span>for Your Computer</span>
            </h1>
            <p className="hero-description">
              Convert video, audio and images on your own computer. Free, open
              source, and privacy-first.
            </p>
            <div className="hero-actions">
              <Button
                asChild
                size="lg"
                className="site-button site-button--large"
              >
                <a href="/download/">
                  Download Free <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="secondary-link"
              >
                <a href="#how-it-works">
                  See How It Works <ChevronRight aria-hidden="true" />
                </a>
              </Button>
            </div>
            <p className="hero-trust">
              Free &amp; open source · MIT licensed · Files stay on your device.
            </p>
            <Button asChild variant="outline" className="github-button">
              <a href="https://github.com/Thavarshan/honeymelon">
                <Star aria-hidden="true" /> Star on GitHub
              </a>
            </Button>
          </div>
          <figure className="hero-screenshot">
            <img
              src="/screenshots/desktop-light.webp"
              alt="Honeymelon 3.0 beta desktop media conversion interface"
              width="1000"
              height="1071"
              fetchPriority="high"
            />
            <figcaption>
              Honeymelon 3.0 beta. Stable releases may look different.
            </figcaption>
          </figure>
        </div>
      </section>

      <section id="proof" className="marketing-section section-border">
        <div className="site-container proof-container">
          <h2 className="section-title">Why Honeymelon?</h2>
          <ul className="proof-list">
            {proofPoints.map(([title, description]) => (
              <li key={title}>
                <span className="check-circle">
                  <Check aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="features" className="marketing-section section-tint">
        <div className="site-container">
          <div className="section-heading">
            <h2>Everything You Need</h2>
            <p>Powerful features, thoughtfully organized.</p>
          </div>
          <div className="feature-groups">
            {featureGroups.map(({ icon: Icon, title, features }) => (
              <article key={title}>
                <div className="feature-title">
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <h3>{title}</h3>
                </div>
                <ul>
                  {features.map(([name, description]) => (
                    <li key={name}>
                      <h4>{name}</h4>
                      <p>{description}</p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="marketing-section">
        <div className="site-container">
          <div className="section-heading">
            <h2>How It Works</h2>
            <p>Three steps. That&apos;s it.</p>
          </div>
          <div className="steps-grid">
            {steps.map(([number, title, description]) => (
              <article key={number}>
                <span className="step-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="interface"
        className="marketing-section section-tint section-border"
      >
        <div className="site-container">
          <div className="section-heading">
            <h2>Made for Your Desktop</h2>
            <p>A thoughtful interface that stays out of your way.</p>
          </div>
          <div className="showcases">
            {showcases.map((item, index) => (
              <article
                key={item.title}
                className="showcase"
                data-reverse={index % 2 === 1}
              >
                <div className="showcase-copy">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>
                        <Check aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <figure>
                  <img
                    src={`/screenshots/${item.image}.webp`}
                    alt={item.alt}
                    width="1000"
                    height="1071"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption>Honeymelon 3.0 beta preview.</figcaption>
                </figure>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="open-source" className="marketing-section">
        <div className="site-container pricing-container">
          <div className="section-heading">
            <h2>Free &amp; Open Source</h2>
            <p>No subscriptions. No license keys. No strings attached.</p>
          </div>
          <div className="open-source-card">
            <div className="price-heading">
              <h3>Honeymelon</h3>
              <p className="price">
                $0 <span>forever</span>
              </p>
              <p>Open source · MIT licensed</p>
            </div>
            <ul className="benefit-list">
              {highlights.map((highlight) => (
                <li key={highlight}>
                  <Check aria-hidden="true" />
                  {highlight}
                </li>
              ))}
            </ul>
            <div className="card-actions">
              <Button
                asChild
                size="lg"
                className="site-button site-button--large"
              >
                <a href="/download/">
                  Download Honeymelon <ArrowRight aria-hidden="true" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="site-button--large"
              >
                <a href="https://github.com/Thavarshan/honeymelon">
                  View on GitHub <ExternalLink aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="download"
        className="marketing-section section-tint section-border"
      >
        <div className="site-container download-container">
          <div className="section-heading">
            <h2>Download for Your Desktop</h2>
            <p>Free and open source. Choose the build for your computer.</p>
          </div>
          <div className="download-card">
            <div>
              <h3>
                Honeymelon <Badge variant="secondary">Desktop</Badge>
              </h3>
              <p>macOS · Windows · Linux</p>
              <dl className="download-facts">
                <div>
                  <dt>Stable release</dt>
                  <dd>For everyday use</dd>
                </div>
                <div>
                  <dt>3.0 beta</dt>
                  <dd>Unsigned testing build</dd>
                </div>
                <div>
                  <dt>Your files</dt>
                  <dd>Processed locally</dd>
                </div>
              </dl>
              <Button
                asChild
                size="lg"
                className="site-button site-button--large"
              >
                <a href="/download/">
                  <Download aria-hidden="true" /> Choose Your Download
                </a>
              </Button>
            </div>
            <div className="installation">
              <h3>Getting Started</h3>
              <ol>
                <li>
                  <span>1</span>Choose your operating system and processor.
                </li>
                <li>
                  <span>2</span>Read the release notes and verify the download.
                </li>
                <li>
                  <span>3</span>Open Honeymelon and start converting locally.
                </li>
              </ol>
              <a className="inline-link" href="/docs/">
                Read the installation guide <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="comparison" className="marketing-section">
        <div className="site-container comparison-container">
          <div className="section-heading">
            <h2>Desktop Today. More to Come.</h2>
            <p>The same local-first idea, wherever you work.</p>
          </div>
          <div className="comparison-table">
            <table>
              <caption className="sr-only">
                Current desktop and planned browser availability
              </caption>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Honeymelon Desktop</th>
                  <th scope="col">Honeymelon Web</th>
                </tr>
              </thead>
              <tbody>
                {[
                  'Local conversion',
                  'Video, audio & images',
                  'Available to download',
                ].map((feature) => (
                  <tr key={feature}>
                    <th scope="row">{feature}</th>
                    <td>
                      <Check aria-hidden="true" />
                      <span className="sr-only">Available</span>
                    </td>
                    <td>Planned</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-note">
            Honeymelon Web is on the roadmap; it is not available yet. Browser
            format support may differ from desktop.
          </p>
        </div>
      </section>

      <section
        id="faq"
        className="marketing-section section-tint section-border"
      >
        <div className="site-container faq-container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question} name="honeymelon-faq">
                <summary>
                  {question}
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        className="marketing-section closing"
        aria-labelledby="closing-heading"
      >
        <div className="site-container comparison-container">
          <h2 id="closing-heading">
            Built for Your Desktop.
            <br />
            Open for Everyone.
          </h2>
          <p>
            Download Honeymelon and make media conversion feel simple again.
            Your files, your computer, your control.
          </p>
          <div className="hero-actions">
            <Button
              asChild
              size="lg"
              className="site-button site-button--large"
            >
              <a href="/download/">
                Download Free <ArrowRight aria-hidden="true" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="github-button"
            >
              <a href="https://github.com/Thavarshan/honeymelon">
                <ShieldCheck aria-hidden="true" /> Explore the Source
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
