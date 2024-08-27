import { describe, expect, test } from '@jest/globals';
import { mount } from '@vue/test-utils';
import Dropfile from '@/ui/blocks/Dropfile.vue';
import { CONVERSION_FORMATS } from '@/consts/formats';

describe('Dropfile.vue', () => {
  test('renders correctly with default props', () => {
    const wrapper = mount(Dropfile);
    expect(wrapper.find('label').exists()).toBe(true);
    expect(wrapper.find('svg').exists()).toBe(true); // Assuming CloudUpload renders an SVG icon
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
  });

  test('computes acceptFormats correctly based on CONVERSION_FORMATS', () => {
    const wrapper = mount(Dropfile);
    const input = wrapper.find('input[type="file"]');
    const expectedFormats = CONVERSION_FORMATS.map((format) => `.${format}`).join(',');
    expect(input.attributes('accept')).toBe(expectedFormats);
  });

  test('emits "file-uploaded" event when a file is selected', async () => {
    const wrapper = mount(Dropfile);
    const input = wrapper.find('input[type="file"]');
    const files = [new File(['sample'], 'sample.txt', { type: 'text/plain' })];

    // Set the files property directly on the input element
    Object.defineProperty(input.element, 'files', {
      value: files,
      writable: false,
    });

    // Trigger the change event
    await input.trigger('change');

    const emitted = wrapper.emitted('file-uploaded');
    expect(emitted).toBeTruthy();
    if (emitted) {
      expect(emitted[0][0]).toBe(files);
    }
  });

  test('emits "file-uploaded" event when files are dropped', async () => {
    const wrapper = mount(Dropfile);
    const files = [new File(['sample'], 'sample.txt', { type: 'text/plain' })];

    await wrapper.trigger('drop', {
      dataTransfer: { files }
    });

    const emitted = wrapper.emitted('file-uploaded');
    expect(emitted).toBeTruthy();
    if (emitted) {
      expect(emitted[0][0]).toBe(files);
    }
  });

  test('changes class when dragging over and leaving', async () => {
    const wrapper = mount(Dropfile);
    const label = wrapper.find('label');

    await wrapper.trigger('dragover');
    expect(label.classes()).toContain('bg-slate-100');

    await wrapper.trigger('dragleave');
    expect(label.classes()).not.toContain('bg-slate-100');
  });
});
