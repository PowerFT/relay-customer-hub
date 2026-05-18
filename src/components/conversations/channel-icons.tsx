/**
 * Inline brand-mark SVGs for the eight supported channels.
 *
 * Lucide 1.x removed Facebook/Instagram/Linkedin/TikTok for trademark
 * reasons. These are small monochrome glyphs that read as the brand when
 * paired with the channel's brand color. All take a `size` prop and inherit
 * `currentColor` so they restyle with parent text color.
 */

import {
  AtSign,
  Globe,
  MessageCircle,
  MessagesSquare,
  Phone,
  type LucideIcon,
} from "lucide-react";

type IconProps = { size?: number; className?: string };
type IconComp = LucideIcon | ((props: IconProps) => React.JSX.Element);

function WhatsAppMark({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.5 14.4c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.4.2-.7 0-.3-.2-1.2-.4-2.3-1.4-.8-.8-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.7-1.6-.9-2.2-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.3-.7.3-1.2.2-1.4-.1-.1-.3-.2-.6-.4zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.1-1.3c1.5.8 3.2 1.2 4.9 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
    </svg>
  );
}
function MessengerMark({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2C6.5 2 2 6.2 2 11.4c0 2.9 1.5 5.5 3.8 7.2v3.4l3.4-1.9c.9.3 1.8.4 2.8.4 5.5 0 10-4.2 10-9.1S17.5 2 12 2zm1 12.2-2.6-2.7L5.5 14.2l5.4-5.6 2.6 2.7 4.9-2.7-5.4 5.6z" />
    </svg>
  );
}
function InstagramMark({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" />
    </svg>
  );
}
function TikTokMark({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M19.6 8.3c-1.4 0-2.7-.5-3.7-1.4v7.6c0 3-2.4 5.5-5.4 5.5s-5.4-2.5-5.4-5.5 2.4-5.5 5.4-5.5c.3 0 .6 0 .9.1v2.9c-.3-.1-.6-.2-.9-.2-1.5 0-2.7 1.2-2.7 2.7s1.2 2.7 2.7 2.7 2.7-1.2 2.7-2.7V2h2.7c0 2 1.6 3.6 3.6 3.6v2.7z" />
    </svg>
  );
}
function LinkedInMark({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM5 8H0v16h5V8zm7.98 0H8.05v16h4.93v-8.4c0-4.65 6.05-5 6.05 0V24H24V13.85C24 6.42 15.62 6.69 12.98 10.34V8z" />
    </svg>
  );
}

export type ChannelIconKey =
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "webchat"
  | "email"
  | "sms"
  | "all";

export const CHANNEL_ICONS: Record<ChannelIconKey, IconComp> = {
  all: MessagesSquare,
  whatsapp: WhatsAppMark,
  messenger: MessengerMark,
  instagram: InstagramMark,
  tiktok: TikTokMark,
  linkedin: LinkedInMark,
  webchat: Globe,
  email: AtSign,
  sms: Phone,
};

/** Convenience for places that want the generic-fallback icon. */
export const FALLBACK_ICON: IconComp = MessageCircle;
