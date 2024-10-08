import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { useToast } from '@/ui/components/toast/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { filesize } from 'filesize';
import { VideoFormat } from '@/enum/video-format';
import { AudioFormat } from '@/enum/audio-format';
import { ImageFormat } from '@/enum/image-format';
import type { Item } from '@/types/item';
import { INITIAL_PROGRESS } from '@/consts/ffprobe';
import { Media } from '@/types/media';

/**
 * Creates a new converter store.
 *
 * @returns {object} The converter store.
 */
export const createConverterStore = () => {
  const uniqueStoreKey = `converter-${uuidv4()}`;

  return defineStore(
    uniqueStoreKey,
    () => {
      const isInitialised = ref(false);
      const { toast } = useToast();
      const mediaType = ref<Media | undefined>(undefined);
      const items = reactive<Item[]>([]);
      const saveDirectory = ref<string | undefined>(undefined);
      const convertTo = ref<VideoFormat | AudioFormat | ImageFormat | undefined>(undefined);
      const conversionCancelled = ref(false);
      const conversionInProgress = ref(false);

      /**
       * Initialise store.
       */
      async function init() {
        let timeout: NodeJS.Timeout;

        saveDirectory.value = await getInitialSaveDirectory();

        // Listen for conversion progress events
        window.electron.on('conversion-progress', (_event, { id, progress }) => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => {
            const item = items.find((item) => item.id === id);
            if (item) {
              item.progress = progress;
            }
          }, 100);
        });

        // Listen for conversion canceled events
        window.electron.on('conversion-canceled', (_event, { id }) => {
          const item = items.find((item) => item.id === id);
          if (item) {
            item.converting = false;
            item.progress = INITIAL_PROGRESS; // Reset progress after cancellation
            conversionInProgress.value = false;
            toast({
              title: 'Conversion canceled',
              description: `Conversion for ${item.name} has been canceled.`,
            });
          }
        });

        isInitialised.value = true;
      }

      /**
       * Clears all event listeners.
       */
      function clearListeners() {
        window.electron.removeAllListeners('conversion-progress');
        window.electron.removeAllListeners('conversion-canceled');
      }

      /**
       * Gets the initial save directory.
       */
      async function getInitialSaveDirectory(): Promise<string> {
        return await window.electron.getDesktopPath();
      }

      /**
       * Sets the media type.
       */
      function setMediaType(type: Media) {
        mediaType.value = type;
      }

      /**
       * Handle file uploads.
       *
       * @param {FileList} uploads - The files to upload.
       */
      function handleUpload(uploads: FileList) {
        items.push(
          ...Array.from(uploads).map(
            (file: File) =>
              ({
                id: uuidv4(),
                name: file.name,
                size: filesize(file.size),
                path: window.electron.getFilePath(file),
                converted: false,
                converting: false,
                convertTo: convertTo.value,
                progress: INITIAL_PROGRESS,
              }) as unknown as Item,
          ),
        );
      }

      /**
       * Updates the save directory.
       *
       * @param {string} directory - The new save directory.
       */
      function handleSaveDirectoryUpdate(directory: string) {
        saveDirectory.value = directory;
      }

      /**
       * Sets the format to convert to.
       *
       * @param {VideoFormat|AudioFormat|ImageFormat} format - The format to convert to.
       */
      function setFormat(format: VideoFormat | AudioFormat | ImageFormat) {
        convertTo.value = format;
      }

      /**
       * Removes an item from the list.
       *
       * @param {number} index - The index of the item to remove.
       */
      function removeItem(index: number) {
        if (items[index].converting) {
          cancelItem(index);
        }
        items.splice(index, 1);
      }

      /**
       * Clears all items from the list.
       */
      function clearItems() {
        items.length = 0;
      }

      /**
       * Performs the conversion of the items.
       */
      async function performConversion() {
        if (!items.length || !convertTo.value || !saveDirectory.value || !mediaType.value) {
          toast({
            title: 'Error',
            description: 'Please select files and a save directory.',
            variant: 'destructive',
          });
          return;
        }

        conversionInProgress.value = true;
        conversionCancelled.value = false;

        for (const item of items) {
          if (conversionCancelled.value) {
            break; // Stop all operations if conversionCancelled is true
          }

          if (item.converted) {
            continue;
          }

          try {
            item.converting = true;
            item.progress = 0;

            await window.electron.convertMedia(
              item.id as string,
              item.path,
              convertTo.value,
              saveDirectory.value,
              mediaType.value,
            );

            item.convertTo = convertTo.value;
            item.converting = false;
            item.converted = true;
            item.progress = 100;
          } catch (error) {
            item.converting = false;
            item.progress = 0;

            if (error.message && error.message.includes('Conversion canceled by user')) {
              conversionCancelled.value = true; // Set the flag to true if conversion is canceled
            } else {
              toast({
                title: 'Error converting file',
                description: error.message || 'An error occurred during the conversion.',
                variant: 'destructive',
              });
            }
          }
        }

        conversionInProgress.value = false;
      }

      /**
       * Cancels the conversion of a specific item.
       *
       * @param {number} index - The index of the item to cancel.
       */
      function cancelItem(index: number) {
        const item = items[index];
        if (!item.converting) return;

        window.electron
          .cancelItemConversion(item.id)
          .then((success) => {
            if (!success) {
              toast({
                title: 'Error',
                description: `Failed to cancel conversion for ${item.name}.`,
                variant: 'destructive',
              });
            }
          })
          .catch((error) => {
            toast({
              title: 'Error',
              description: error.message || 'An unexpected error occurred while canceling the conversion.',
              variant: 'destructive',
            });
          });
      }

      /**
       * Cancels all ongoing conversions without removing items from the queue.
       */
      function cancelConversion() {
        window.electron
          .cancelConversion()
          .then((success) => {
            if (!success) {
              toast({
                title: 'Error',
                description: 'Failed to cancel the conversion.',
                variant: 'destructive',
              });
            } else {
              // Cancel ongoing conversions
              items.forEach((item) => {
                if (item.converting) {
                  item.converting = false;
                  item.progress = INITIAL_PROGRESS;
                }
              });
              conversionInProgress.value = false; // Reset the conversion flag
              conversionCancelled.value = true; // Set the cancellation flag
              toast({
                title: 'Conversion canceled',
                description: 'All ongoing conversions have been canceled. Items remain in the queue.',
              });
            }
          })
          .catch((error) => {
            toast({
              title: 'Error',
              description: error.message || 'An unexpected error occurred while canceling the conversion.',
              variant: 'destructive',
            });
          });
      }

      return {
        items,
        isInitialised,
        saveDirectory,
        mediaType,
        convertTo,
        conversionInProgress,
        setMediaType,
        handleUpload,
        getInitialSaveDirectory,
        handleSaveDirectoryUpdate,
        setFormat,
        removeItem,
        clearItems,
        performConversion,
        cancelItem,
        cancelConversion,
        clearListeners,
        init,
      };
    },
    {
      persist: {
        key: uniqueStoreKey,
        storage: localStorage,
      },
    },
  );
};
