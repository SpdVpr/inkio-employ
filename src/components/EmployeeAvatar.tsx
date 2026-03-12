'use client';

/**
 * EmployeeAvatar — renders a local avatar from /avatars/{id}.png
 * Each employee can pick an avatar by number (1–96).
 * If no avatar is set, a default based on employee name hash is used.
 */

export const TOTAL_AVATARS = 96;

interface EmployeeAvatarProps {
  name: string;
  avatarId?: number;     // 1–96
  size?: number;         // px (default: 36)
  className?: string;
}

/** Generate a consistent avatar number from a name */
export function nameToAvatarId(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return (Math.abs(hash) % TOTAL_AVATARS) + 1;
}

export function getAvatarSrc(avatarId: number): string {
  return `/avatars/${avatarId}.png`;
}

export default function EmployeeAvatar({ name, avatarId, size = 36, className = '' }: EmployeeAvatarProps) {
  const id = avatarId || nameToAvatarId(name);
  const src = getAvatarSrc(id);

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}
