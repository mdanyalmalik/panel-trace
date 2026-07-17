import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 2,
  viewBox: "0 0 24 24",
  "aria-hidden": true
} as const;

export const ArrowLeftIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export const ArrowRightIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="m12 5 7 7-7 7" />
    <path d="M5 12h14" />
  </svg>
);

export const BookOpenIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M12 7v14" />
    <path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H12v19H6.5A3.5 3.5 0 0 0 3 17.5z" />
    <path d="M21 5.5A3.5 3.5 0 0 0 17.5 2H12v19h5.5a3.5 3.5 0 0 1 3.5-3.5z" />
  </svg>
);

export const CheckCircleIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

export const EyeIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="m3 3 18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-3 4.3" />
    <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 4.1-.9" />
  </svg>
);

export const FileTextIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </svg>
);

export const FolderIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
  </svg>
);

export const FolderPlusIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8.5a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
    <path d="M12 11v6" />
    <path d="M9 14h6" />
  </svg>
);

export const MessageSquareIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
  </svg>
);

export const MinusIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M5 12h14" />
  </svg>
);

export const PlusIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

export const PowerIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M12 2v10" />
    <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
  </svg>
);

export const RefreshIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M21 12a9 9 0 0 0-15.4-6.4L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 15.4 6.4L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

export const SaveIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </svg>
);

export const SearchIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const SendIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </svg>
);

export const SettingsIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
    <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2.1 2.1 0 0 1-3 3l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V21a2.1 2.1 0 0 1-4.2 0v-.2a1.8 1.8 0 0 0-1.2-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2.1 2.1 0 0 1-3-3l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1.1H2a2.1 2.1 0 0 1 0-4.2h.2a1.8 1.8 0 0 0 1.7-1.2 1.8 1.8 0 0 0-.4-2l-.1-.1a2.1 2.1 0 0 1 3-3l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1.1-1.7V2a2.1 2.1 0 0 1 4.2 0v.2a1.8 1.8 0 0 0 1.2 1.7 1.8 1.8 0 0 0 2-.4l.1-.1a2.1 2.1 0 0 1 3 3l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1.1h.2a2.1 2.1 0 0 1 0 4.2h-.2a1.8 1.8 0 0 0-1.9 1.2Z" />
  </svg>
);

export const TrashIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export const XIcon = (props: IconProps): JSX.Element => (
  <svg {...baseProps} {...props}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);
