import { describe, expect, test, jest } from '@jest/globals';
import { shallowMount } from '@vue/test-utils';
import SaveDirectorySelector from '@/ui/blocks/SaveDirectory.vue';

describe('SaveDirectorySelector.vue', () => {
  test('emits "directory-selected" event when a new directory is selected', async () => {
    const mockDirectory = '/new/directory';

    // Properly type the mock implementation
    window.electron = {
      selectDirectory: jest.fn<() => Promise<string | undefined>>().mockResolvedValue(mockDirectory),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    const wrapper = shallowMount(SaveDirectorySelector);
    await wrapper.findComponent({ name: 'DialogTrigger' }).trigger('click');

    const button = wrapper.find('button');
    await button.trigger('click');

    expect(window.electron.selectDirectory).toHaveBeenCalled();

    const emitted = wrapper.emitted('directory-selected');
    expect(emitted).toBeTruthy();
    if (emitted) {
      expect(emitted[0][0]).toBe(mockDirectory);
    }
  });

  test('does not emit "directory-selected" event if no directory is selected', async () => {
    // Properly type the mock implementation
    window.electron = {
      selectDirectory: jest.fn<() => Promise<string | undefined>>().mockResolvedValue(undefined), // Return undefined to simulate no selection
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    const wrapper = shallowMount(SaveDirectorySelector);
    await wrapper.findComponent({ name: 'DialogTrigger' }).trigger('click');

    const button = wrapper.find('button');
    await button.trigger('click');

    expect(window.electron.selectDirectory).toHaveBeenCalled();

    const emitted = wrapper.emitted('directory-selected');
    expect(emitted).toBeFalsy();
  });

  test('dialog shows up when triggered and can be closed', async () => {
    const wrapper = shallowMount(SaveDirectorySelector);

    // Trigger the dialog
    await wrapper.findComponent({ name: 'DialogTrigger' }).trigger('click');
    expect(wrapper.findComponent({ name: 'DialogContent' }).exists()).toBe(true);

    // Close the dialog
    await wrapper.findComponent({ name: 'DialogClose' }).trigger('click');
    await wrapper.vm.$nextTick(); // Ensure DOM updates are processed
    expect(wrapper.findComponent({ name: 'DialogContent' }).exists()).toBe(false);
  });
});
