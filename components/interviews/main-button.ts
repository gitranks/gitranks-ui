import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** The one main button of a view on My interviews and How it works: a link drawn as the site's large button. */
export const INTERVIEWS_MAIN_BUTTON = cn(buttonVariants({ size: 'lg' }), 'font-semibold max-sm:min-h-11');
