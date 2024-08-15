import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import SaveDirectory from '../../src/components/blocks/SaveDirectory.vue';

describe('SaveDirectory', () => {
  it('renders correctly with the initial state', () => {
    const wrapper = mount(SaveDirectory, {
      props: {
        defaultSaveDirectory: undefined,
      },
    });

    expect(wrapper.find('button').exists()).toBe(true);
    expect(wrapper.find('p').exists()).toBe(false);
  });

  it('displays the defaultSaveDirectory if provided', () => {
    const wrapper = mount(SaveDirectory, {
      props: {
        defaultSaveDirectory: '/default/directory',
      },
    });

    expect(wrapper.find('p').exists()).toBe(true);
    expect(wrapper.find('p').text()).toContain('/default/directory');
  });

  it('emits "directory-selected" event with the selected directory', async () => {
    const mockDirectory = '/selected/directory';
    // Mock the electron API
    (window as any).electron = {
      selectDirectory: jest.fn().mockResolvedValue(mockDirectory),
    };

    const wrapper = mount(SaveDirectory);

    await wrapper.find('button').trigger('click');

    expect((window as any).electron.selectDirectory).toHaveBeenCalled();
    expect(wrapper.emitted()['directory-selected']).toBeTruthy();
    expect(wrapper.emitted()['directory-selected'][0]).toEqual([mockDirectory]);
    expect(wrapper.find('p').text()).toContain(mockDirectory);
  });

  it('does not emit "directory-selected" if no directory is selected', async () => {
    // Mock the electron API
    (window as any).electron = {
      selectDirectory: jest.fn().mockResolvedValue(undefined),
    };

    const wrapper = mount(SaveDirectory);

    await wrapper.find('button').trigger('click');

    expect((window as any).electron.selectDirectory).toHaveBeenCalled();
    expect(wrapper.emitted()['directory-selected']).toBeFalsy();
  });
});
