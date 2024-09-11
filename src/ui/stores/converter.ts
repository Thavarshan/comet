import { defineStore } from 'pinia';
import { reactive, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useToast } from '../components/toast/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { filesize } from 'filesize';
import type { Item } from '@/types/item';

export const createConverterStore = () => {
  const uniqueStoreKey = `converter-${uuidv4()}`; // Generate a unique key for each store instance

  return defineStore(uniqueStoreKey, () => {
    const { toast } = useToast();
    const INITIAL_PROGRESS = 0;
    const items = reactive<Item[]>([]);
    const saveDirectory = ref<string | undefined>();
    const convertTo = ref<string | undefined>('mp4');
    const conversionInProgress = ref(false);

    onMounted(async () => {
      let timeout: NodeJS.Timeout;

      window.electron.on('conversion-progress', (_event, { id, progress }) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          const item = items.find((item) => item.id === id);
          if (item) {
            item.progress = progress;
          }
        }, 100);
      });

      window.electron.on('conversion-canceled', (_event, { id }) => {
        const item = items.find((item) => item.id === id);
        if (item) {
          item.converting = false;
          item.progress = 0; // Reset progress after cancellation
          conversionInProgress.value = false;
          toast({
            title: 'Conversion canceled',
            description: `Conversion for ${item.name} has been canceled.`,
          });
        }
      });
    });

    onBeforeUnmount(() => {
      window.electron.removeAllListeners('conversion-progress');
      window.electron.removeAllListeners('conversion-canceled');
    });

    async function getInitialSaveDirectory() {
      return await window.electron.getDesktopPath();
    }

    function handleUpload(uploads: FileList) {
      items.push(
        ...Array.from(uploads).map((file: File) => ({
          id: uuidv4(),
          name: file.name,
          size: filesize(file.size),
          path: window.electron.getFilePath(file),
          converted: false,
          converting: false,
          convertTo: convertTo.value,
          progress: INITIAL_PROGRESS,
        } as unknown as Item))
      );
    }

    function handleSaveDirectoryUpdate(directory: string) {
      saveDirectory.value = directory;
    }

    function setFormat(format: string) {
      convertTo.value = format;
    }

    function removeItem(index: number) {
      if (items[index].converting) {
        cancelItem(index);
      }
      items.splice(index, 1);
    }

    function clearItems() {
      items.length = 0;
    }

    async function performConversion() {
      if (!items.length || !convertTo.value || !saveDirectory.value) {
        toast({
          title: 'Error',
          description: 'Please select files and a save directory.',
          variant: 'destructive',
        });
        return;
      }

      conversionInProgress.value = true;

      const conversionPromises = items.map(async (item) => {
        if (item.converted) return;

        try {
          item.converting = true;
          item.progress = 0;

          const outputFilePath = await window.electron.convertVideo(
            item.id as string,
            item.path,
            convertTo.value || 'mp4',
            saveDirectory.value as string
          );

          item.converting = false;
          item.converted = true;
          item.progress = 100;

          toast({
            title: 'File converted',
            description: `Converted file saved to ${outputFilePath}`,
          });
        } catch (error) {
          item.converting = false;
          item.progress = 0;

          if (!error.message?.includes('Conversion canceled by user')) {
            toast({
              title: 'Error converting file',
              description: error.message || 'An error occurred during the conversion.',
              variant: 'destructive',
            });
          }
        }
      });

      await Promise.all(conversionPromises);

      conversionInProgress.value = false;
      await nextTick(); // Ensure UI updates right away
    }

    function cancelItem(index: number) {
      const item = items[index];
      if (!item.converting) return;

      window.electron.cancelConversion(item.id)
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

    function cancelConversion() {
      // Implement cancel conversion logic if needed
    }

    return {
      items,
      saveDirectory,
      convertTo,
      conversionInProgress,
      handleUpload,
      getInitialSaveDirectory,
      handleSaveDirectoryUpdate,
      setFormat,
      removeItem,
      clearItems,
      performConversion,
      cancelItem,
      cancelConversion,
    };
  }, {
    persist: {
      key: uniqueStoreKey,  // Persist state with the unique key
      storage: localStorage, // You can change this to sessionStorage or custom storage if needed
    }
  });
};
