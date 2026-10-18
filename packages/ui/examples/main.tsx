import { useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../src/components/button';
import { Badge } from '../src/components/badge';
import { Input } from '../src/components/input';
import { Progress } from '../src/components/progress';
import { Tabs, TabsList, TabsTrigger } from '../src/components/tabs';
import '../src/styles/globals.css';

function Gallery(): ReactElement {
  const [dark, setDark] = useState(false);

  return (
    <main className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-background text-foreground p-10 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Comet UI</h1>
            <p className="text-muted-foreground mt-2">
              Mira · zinc · blue · Inter
            </p>
          </div>
          <Button onClick={() => setDark(!dark)}>Toggle appearance</Button>
        </header>
        <div className="flex flex-wrap gap-4">
          <Button>Primary action</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Quiet action</Button>
          <Button variant="destructive">Cancel</Button>
          <Button disabled>Unavailable</Button>
        </div>
        <Tabs defaultValue="video">
          <TabsList>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="image">Images</TabsTrigger>
          </TabsList>
        </Tabs>
        <section className="max-w-lg rounded-lg border p-6 space-y-5">
          <h2 className="font-medium">Conversion states</h2>
          <Input aria-label="Example filename" placeholder="filename.mp4" />
          <Progress aria-label="Example progress" value={42} />
          <div className="flex gap-2">
            <Badge>Converting</Badge>
            <Badge variant="secondary">Queued</Badge>
            <Badge variant="outline">Complete</Badge>
          </div>
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Gallery />);
