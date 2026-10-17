import { Separator } from '@comet/ui/components/separator';
import { Disclosure } from '@comet/ui/components/disclosure';
import {
  SelectControl,
  SelectOption,
} from '@comet/ui/components/select-control';
import { useId, type ReactElement, type ReactNode } from 'react';
import { FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@comet/ui/components/input';
import { Label } from '@comet/ui/components/label';
import { Slider } from '@comet/ui/components/slider';
import { Switch } from '@comet/ui/components/switch';
import {
  defaultConversion,
  type Capabilities,
  type ConversionSpec,
  type MediaType,
  type Preferences,
} from '@comet/contracts';
import { FormatPicker } from './FormatPicker';
import { Button } from './Button';

interface InspectorProps {
  media: MediaType;
  settings: Preferences['media'][MediaType];
  capabilities: Capabilities;
  change: (format: string, spec: ConversionSpec) => void;
  selectDirectory: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="inspector-field">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/**
 * Configure the next submission without changing any submitted job settings.
 */
export function OutputInspector({
  media,
  settings,
  capabilities,
  change,
  selectDirectory,
}: InspectorProps): ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const spec = settings.spec ?? defaultConversion(media);
  const codecCapability = capabilities[spec.kind].find(
    (item) => item.format === settings.format,
  );
  const update = (value: ConversionSpec) => change(settings.format, value);
  const modernVideo = [
    'mp4',
    'mkv',
    'mov',
    'flv',
    'm4v',
    'f4v',
    'h264',
    'hevc',
    'webm',
  ].includes(settings.format);
  const lossless =
    ['flac', 'wav', 'aiff', 'wv', 'tta', 'caf'].includes(settings.format) ||
    (spec.kind === 'audio' && spec.codec === 'alac');

  return (
    <div className="output-inspector">
      {media === 'video' && (
        <Field label={t('design.operation')}>
          <SelectControl
            label={t('design.operation')}
            value={spec.kind}
            onValueChange={(value) => {
              const kind = value as MediaType;
              change(
                { video: 'mp4', audio: 'mp3', image: 'jpg' }[kind],
                defaultConversion(kind),
              );
            }}
          >
            <SelectOption value="video">
              {t('design.convertVideo')}
            </SelectOption>
            <SelectOption value="audio">
              {t('design.extractAudio')}
            </SelectOption>
            <SelectOption value="image">{t('design.saveFrame')}</SelectOption>
          </SelectControl>
        </Field>
      )}
      <Field label={t('ui.format')}>
        <FormatPicker
          value={settings.format}
          options={capabilities[spec.kind]}
          onChange={(format) => change(format, defaultConversion(spec.kind))}
        />
      </Field>
      {spec.kind !== 'image' && !!codecCapability?.codecs?.length && (
        <Field label={t('design.codec')}>
          <SelectControl
            label={t('design.codec')}
            value={spec.codec}
            onValueChange={(value) =>
              update({ ...spec, codec: value } as ConversionSpec)
            }
          >
            <SelectOption value="default">
              {t('design.compatible')}
            </SelectOption>
            {codecCapability.codecs.map((codec) => (
              <SelectOption key={codec} value={codec}>
                {codec === 'alac' ? 'Apple Lossless' : codec.toUpperCase()}
              </SelectOption>
            ))}
          </SelectControl>
        </Field>
      )}
      {spec.kind === 'video' && modernVideo && (
        <Field label={t('design.preset')}>
          <SelectControl
            label={t('design.preset')}
            value={spec.quality}
            onValueChange={(value) =>
              update({ ...spec, quality: value } as ConversionSpec)
            }
          >
            {(['small', 'balanced', 'high'] as const).map((quality) => (
              <SelectOption key={quality} value={quality}>
                {t(`design.${quality}`)}
              </SelectOption>
            ))}
          </SelectControl>
        </Field>
      )}
      <Separator />
      <Field label={t('ui.destination')}>
        <Button
          title={settings.directory}
          onClick={selectDirectory}
          className="w-full justify-start min-w-0"
        >
          <FolderOpen size={16} />
          <span className="truncate">
            {settings.directory.split(/[\\/]/).filter(Boolean).at(-1) ??
              settings.directory}
          </span>
        </Button>
        <p className="field-help break-all">{settings.directory}</p>
      </Field>
      <Disclosure className="advanced-options" label={t('design.advanced')}>
        {spec.kind === 'video' && (
          <>
            {modernVideo && spec.codec !== 'prores' && (
              <Field label={t('design.speed')}>
                <SelectControl
                  label={t('design.speed')}
                  value={spec.speed}
                  onValueChange={(value) =>
                    update({
                      ...spec,
                      speed: value,
                    } as ConversionSpec)
                  }
                >
                  {['fast', 'medium', 'slow'].map((speed) => (
                    <SelectOption key={speed} value={speed}>
                      {t(`design.${speed}`)}
                    </SelectOption>
                  ))}
                </SelectControl>
              </Field>
            )}
            <Field label={t('design.resolution')}>
              <SelectControl
                label={t('design.resolution')}
                value={spec.height ?? ''}
                onValueChange={(value) => {
                  const rest = { ...spec };
                  delete rest.height;
                  delete rest.width;
                  update(value ? { ...rest, height: Number(value) } : rest);
                }}
              >
                <SelectOption value="">{t('design.original')}</SelectOption>
                {[480, 720, 1080, 2160].map((height) => (
                  <SelectOption key={height} value={height}>
                    {height}p
                  </SelectOption>
                ))}
              </SelectControl>
            </Field>
            <Field label={t('design.frameRate')}>
              <SelectControl
                label={t('design.frameRate')}
                value={spec.frameRate ?? ''}
                onValueChange={(value) => {
                  const rest = { ...spec };
                  delete rest.frameRate;
                  update(value ? { ...rest, frameRate: Number(value) } : rest);
                }}
              >
                <SelectOption value="">{t('design.original')}</SelectOption>
                {[24, 25, 30, 50, 60].map((rate) => (
                  <SelectOption key={rate} value={rate}>
                    {rate} fps
                  </SelectOption>
                ))}
              </SelectControl>
            </Field>
            <label className="switch-field" htmlFor={`${id}-audio`}>
              {t('design.includeAudio')}
              <Switch
                id={`${id}-audio`}
                checked={spec.includeAudio}
                onCheckedChange={(includeAudio) =>
                  update({ ...spec, includeAudio })
                }
              />
            </label>
          </>
        )}
        {spec.kind === 'audio' && (
          <>
            {!lossless && (
              <Field label={t('design.bitrate')}>
                <SelectControl
                  label={t('design.bitrate')}
                  value={spec.bitrate ?? ''}
                  onValueChange={(value) => {
                    const rest = { ...spec };
                    delete rest.bitrate;
                    update(value ? { ...rest, bitrate: Number(value) } : rest);
                  }}
                >
                  <SelectOption value="">{t('design.automatic')}</SelectOption>
                  {[64, 96, 128, 192, 256, 320].map((rate) => (
                    <SelectOption key={rate} value={rate}>
                      {rate} kbps
                    </SelectOption>
                  ))}
                </SelectControl>
              </Field>
            )}
            <Field label={t('design.sampleRate')}>
              <SelectControl
                label={t('design.sampleRate')}
                value={spec.sampleRate ?? ''}
                onValueChange={(value) => {
                  const rest = { ...spec };
                  delete rest.sampleRate;
                  update(
                    value
                      ? ({
                          ...rest,
                          sampleRate: Number(value),
                        } as ConversionSpec)
                      : rest,
                  );
                }}
              >
                <SelectOption value="">{t('design.original')}</SelectOption>
                {[22050, 44100, 48000, 96000].map((rate) => (
                  <SelectOption key={rate} value={rate}>
                    {rate} Hz
                  </SelectOption>
                ))}
              </SelectControl>
            </Field>
            <Field label={t('design.channels')}>
              <SelectControl
                label={t('design.channels')}
                value={spec.channels ?? ''}
                onValueChange={(value) => {
                  const rest = { ...spec };
                  delete rest.channels;
                  update(
                    value
                      ? ({
                          ...rest,
                          channels: Number(value),
                        } as ConversionSpec)
                      : rest,
                  );
                }}
              >
                <SelectOption value="">{t('design.original')}</SelectOption>
                <SelectOption value="1">Mono</SelectOption>
                <SelectOption value="2">Stereo</SelectOption>
              </SelectControl>
            </Field>
            {['wav', 'aiff', 'caf'].includes(settings.format) &&
              spec.codec !== 'alac' && (
                <Field label={t('design.bitDepth')}>
                  <SelectControl
                    label={t('design.bitDepth')}
                    value={spec.bitDepth ?? 16}
                    onValueChange={(value) =>
                      update({
                        ...spec,
                        bitDepth: Number(value),
                      } as ConversionSpec)
                    }
                  >
                    <SelectOption value="16">16-bit PCM</SelectOption>
                    <SelectOption value="24">24-bit PCM</SelectOption>
                  </SelectControl>
                </Field>
              )}
            <Field label={t('design.track')}>
              <Input
                type="number"
                min="0"
                max="31"
                value={spec.track}
                aria-label={t('design.track')}
                onChange={(event) =>
                  update({ ...spec, track: Number(event.target.value) })
                }
              />
              <p className="field-help">{t('design.trackHint')}</p>
            </Field>
          </>
        )}
        {spec.kind === 'image' && (
          <>
            {media === 'video' && (
              <Field label={t('design.timestamp')}>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  max="86400"
                  aria-label={t('design.timestamp')}
                  value={spec.timestamp}
                  onChange={(event) =>
                    update({ ...spec, timestamp: Number(event.target.value) })
                  }
                />
              </Field>
            )}
            {['jpg', 'jpeg', 'webp', 'avif'].includes(settings.format) && (
              <Field label={`${t('design.quality')} · ${spec.quality}`}>
                <Slider
                  aria-label={t('design.quality')}
                  min={1}
                  max={100}
                  value={[spec.quality]}
                  onValueChange={([quality]) =>
                    update({ ...spec, quality: quality ?? 85 })
                  }
                />
              </Field>
            )}
            {['webp', 'avif'].includes(settings.format) && (
              <label className="switch-field" htmlFor={`${id}-lossless`}>
                {t('design.lossless')}
                <Switch
                  id={`${id}-lossless`}
                  checked={spec.lossless}
                  onCheckedChange={(lossless) => update({ ...spec, lossless })}
                />
              </label>
            )}
            {(['width', 'height'] as const).map((axis) => (
              <Field key={axis} label={t(`design.${axis}`)}>
                <Input
                  type="number"
                  min="16"
                  max="8192"
                  aria-label={t(`design.${axis}`)}
                  value={spec[axis] ?? ''}
                  placeholder={t('design.original')}
                  onChange={(event) => {
                    const next = { ...spec };
                    delete next[axis];
                    if (event.target.value) {
                      next[axis] = Number(event.target.value);
                    }

                    update(next);
                  }}
                />
              </Field>
            ))}
            <label className="switch-field" htmlFor={`${id}-flatten`}>
              {t('design.flatten')}
              <Switch
                id={`${id}-flatten`}
                checked={spec.allowFlatten}
                onCheckedChange={(allowFlatten) =>
                  update({ ...spec, allowFlatten })
                }
              />
            </label>
            <p className="field-help">{t('design.flattenHint')}</p>
            <Input
              type="color"
              aria-label={t('design.background')}
              value={spec.background}
              onChange={(event) =>
                update({ ...spec, background: event.target.value })
              }
            />
          </>
        )}
      </Disclosure>
      <div className="output-summary">
        <span>{t('design.summary')}</span>
        <strong>
          {settings.format.toUpperCase()}
          {spec.kind !== 'image' && spec.codec !== 'default'
            ? ` · ${spec.codec.toUpperCase()}`
            : ''}
        </strong>
        <p>{t('design.originalsSafe')}</p>
      </div>
    </div>
  );
}
