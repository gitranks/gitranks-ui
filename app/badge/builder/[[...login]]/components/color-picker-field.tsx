import { hsvaToHex, hexToHsva } from '@uiw/color-convert';
import Colorful from '@uiw/react-color-colorful';
import * as React from 'react';
import { useFormContext, useController } from 'react-hook-form';

import { isValidHex } from '@/badge/utils/is-valid-hex';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
  name: string; // "labelBgColor"
  label?: string; // "Label Background Color"
  placeholder?: string; // "#hex"
};

const normalizeHex = (v: string) => {
  const t = v.trim();
  return t.startsWith('#') ? t : `#${t}`;
};

export function ColorPickerField({ name, label, placeholder = '#hex' }: Props) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });

  const hex = typeof field.value === 'string' && field.value ? field.value : '#000000';
  const [open, setOpen] = React.useState(false);
  const [hsva, setHsva] = React.useState(() => {
    return isValidHex(hex) ? hexToHsva(normalizeHex(hex)) : hexToHsva('#000000');
  });

  // синхронізуємо локальний hsva, якщо значення поля змінюється ззовні
  React.useEffect(() => {
    if (isValidHex(hex)) setHsva(hexToHsva(normalizeHex(hex)));
  }, [hex]);

  return (
    <FormItem>
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
              style={{ background: isValidHex(hex) ? normalizeHex(hex) : '#000000' }}
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
      <FormControl /> {/* сумісність із shadcn Form API; можна прибрати якщо не потрібно */}
      <FormMessage>{fieldState.error?.message}</FormMessage>
    </FormItem>
  );
}
