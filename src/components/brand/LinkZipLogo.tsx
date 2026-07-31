import type { SVGProps } from 'react';
import clsx from 'clsx';

interface LinkZipMarkProps extends SVGProps<SVGSVGElement> {
  title?: string;
}

export const LinkZipMark = ({ className, title, ...props }: LinkZipMarkProps) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role={title ? 'img' : undefined}
    aria-hidden={title ? undefined : true}
    {...props}
  >
    {title && <title>{title}</title>}
    <path d="M12.5 3h23C41.8 3 45 6.9 45 13v21.5C45 41.2 41 45 34.4 45H13.2C6.6 45 3 41 3 34.5V12.8C3 6.7 6.8 3 12.5 3Z" fill="#171714" />
    <path d="M14 15h16.5a4.5 4.5 0 0 1 0 9H18a4.5 4.5 0 0 0 0 9h16" stroke="#FFFDF8" strokeWidth="5" strokeLinecap="round" />
    <circle cx="13.5" cy="15" r="4.5" fill="#D9FF67" stroke="#171714" strokeWidth="2" />
    <circle cx="34.5" cy="33" r="4.5" fill="#FF5F35" stroke="#171714" strokeWidth="2" />
  </svg>
);

interface LinkZipLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

const LinkZipLogo = ({
  className,
  markClassName,
  textClassName,
  showText = true,
}: LinkZipLogoProps) => (
  <span className={clsx('inline-flex items-center gap-2.5', className)}>
    <LinkZipMark className={clsx('h-10 w-10 shrink-0', markClassName)} />
    {showText && (
      <span className={clsx('text-xl font-black tracking-[-0.055em]', textClassName)}>
        Link<span className="text-[#ff5f35]">Zip</span>
      </span>
    )}
  </span>
);

export default LinkZipLogo;
