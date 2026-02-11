import Link from 'next/link';
import { DocsIcon } from '@hyperlane-xyz/widgets';
import { Color } from '../../styles/Color';

export function FloatingButtonStrip() {
  return (
    <div className="absolute -right-8 top-2 hidden flex-col items-center justify-end gap-3 sm:flex">
      <Link
        href="https://docs.hyperlane.xyz"
        target="_blank"
        className={`p-0.5 ${styles.roundedCircle} ${styles.link}`}
      >
        <DocsIcon color={Color.primary['500']} height={21} width={21} className="p-px" />
      </Link>
    </div>
  );
}

const styles = {
  link: 'hover:opacity-70 active:opacity-60',
  roundedCircle: 'rounded-full bg-white',
};
