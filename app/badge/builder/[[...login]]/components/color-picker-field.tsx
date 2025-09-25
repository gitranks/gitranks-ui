import { hexToHsva, hsvaToHex } from '@uiw/color-convert';
import Colorful from '@uiw/react-color-colorful';
import { useEffect, useMemo, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';

import { isValidHex } from '@/badge/utils/is-valid-hex';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
  name: string;
  label?: string;
  placeholder?: string;
  defaultValue: string;
};

const normalizeHex = (v: string) => {
  const t = v.trim();
  return t.startsWith('#') ? t : `#${t}`;
};

export function ColorPickerField({ name, label, placeholder, defaultValue }: Props) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });

  const hex = field.value;
  const selectedHex = useMemo(
    () => (isValidHex(hex) ? normalizeHex(hex) : normalizeHex(defaultValue)),
    [hex, defaultValue],
  );
  const [open, setOpen] = useState(false);
  const [hsva, setHsva] = useState(() => hexToHsva(selectedHex));

  useEffect(() => {
    setHsva(hexToHsva(selectedHex));
  }, [selectedHex]);

  return (
    <FormItem className="flex-grow">
      {label && <FormLabel>{label}</FormLabel>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={hex}
              placeholder={placeholder}
              onChange={(e) => {
                const v = e.target.value;
                field.onChange(v);
                if (isValidHex(v)) {
                  setHsva(hexToHsva(normalizeHex(v)));
                }
              }}
              onClick={() => setOpen(true)}
              className="pl-10"
              inputMode="text"
              spellCheck={false}
            />
            <span
              aria-hidden
              className={cn('absolute left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded border')}
              style={{ background: selectedHex }}
              onClick={() => setOpen(true)}
            />
          </div>
        </PopoverTrigger>

        <PopoverContent align="start" className="p-0 w-auto">
          <Colorful
            color={hsva}
            disableAlpha
            onChange={(c) => {
              setHsva(c.hsva);
              field.onChange(hsvaToHex(c.hsva));
            }}
          />
        </PopoverContent>
      </Popover>
      <FormControl />
      <FormMessage>{fieldState.error?.message}</FormMessage>
    </FormItem>
  );
}
