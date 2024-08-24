export interface Item extends File {
  id: number | string;
  path: string;
  converted: boolean;
  outputFormat?: string;
  saveDirectory?: string;
  progress: number;
  converting: boolean;
}
