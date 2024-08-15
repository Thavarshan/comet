import { mount } from '@vue/test-utils';
import Dropfile from '../../src/components/blocks/Dropfile.vue';

describe('Dropfile.vue', () => {
  it('renders correctly with the initial state', () => {
    const wrapper = mount(Dropfile);

    // Check that the label is rendered correctly
    expect(wrapper.find('label').exists()).toBe(true);
    // Check that the input is hidden initially
    expect(wrapper.find('input[type="file"]').exists()).toBe(true);
    expect(wrapper.find('input[type="file"]').isVisible()).toBe(false);
    // Check that the text is rendered correctly
    expect(wrapper.find('p').text()).toBe('Drag your files here');
  });

  it('handles file upload via input', async () => {
    const wrapper = mount(Dropfile);
    const fileInput = wrapper.find('input[type="file"]');
    const mockFile = new File(['mock content'], 'mock-video.mp4', { type: 'video/mp4' });
    const files = [mockFile];

    // Simulate file upload via the input
    await fileInput.trigger('change', { target: { files } });

    // Check that the event was emitted with the correct files
    expect(wrapper.emitted()['file-uploaded']).toBeTruthy();
    expect(wrapper.emitted()['file-uploaded'][0]).toEqual([files]);
  });

  it('handles drag over event', async () => {
    const wrapper = mount(Dropfile);

    // Simulate drag over
    await wrapper.find('label').trigger('dragover');

    // Check that the isDragging state is true
    expect(wrapper.vm.isDragging).toBe(true);

    // Check that the class 'bg-slate-100' is applied during drag over
    expect(wrapper.find('label').classes()).toContain('bg-slate-100');
  });

  it('handles drag leave event', async () => {
    const wrapper = mount(Dropfile);

    // Simulate drag over and then drag leave
    await wrapper.find('label').trigger('dragover');
    await wrapper.find('label').trigger('dragleave');

    // Check that the isDragging state is false
    expect(wrapper.vm.isDragging).toBe(false);

    // Check that the class 'bg-slate-100' is removed after drag leave
    expect(wrapper.find('label').classes()).not.toContain('bg-slate-100');
  });

  it('handles file drop event', async () => {
    const wrapper = mount(Dropfile);
    const mockFile = new File(['mock content'], 'mock-video.mp4', { type: 'video/mp4' });
    const files = [mockFile];

    // Simulate drop event
    await wrapper.find('label').trigger('drop', {
      dataTransfer: { files },
      preventDefault: jest.fn(),
    });

    // Check that the isDragging state is false after drop
    expect(wrapper.vm.isDragging).toBe(false);

    // Check that the event was emitted with the correct files
    expect(wrapper.emitted()['file-uploaded']).toBeTruthy();
    expect(wrapper.emitted()['file-uploaded'][0]).toEqual([files]);
  });
});
