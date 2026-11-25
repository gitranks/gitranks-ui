import { ContributeNoProfileOf, type SetupProduct } from './setting-up';
import { loadContributeSetupState } from '@/lib/workspace/contribute.data';

/**
 * The panel for a signed-in account with no Contribute view (`ContributeNoProfileOf`), its setup's state read now: the
 * read starts the first read of a new account, so it shows the setting-up panel at once.
 */
export async function ContributeNoProfileRead({ product = 'Contribute' }: { product?: SetupProduct }) {
  return <ContributeNoProfileOf state={await loadContributeSetupState()} product={product} />;
}
