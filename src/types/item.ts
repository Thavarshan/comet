import { Media } from './media';

export interface Item extends File {
  id: number | string;
  type: Media;
  path: string;
  converted: boolean;
  outputFormat?: string;
  saveDirectory?: string;
  progress: number;
  converting: boolean;
  convertTo?: string;
}
