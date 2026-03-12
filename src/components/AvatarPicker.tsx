'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TOTAL_AVATARS, nameToAvatarId, getAvatarSrc } from './EmployeeAvatar';
import { X } from 'lucide-react';

interface AvatarPickerProps {
  name: string;
  currentAvatarId?: number;
  onSelect: (avatarId: number) => void;
}

function AvatarGallery({
  name,
  activeId,
  onSelect,
  onClose,
}: {
  name: string;
  activeId: number;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="avatar-backdrop" onClick={onClose} />
      {/* Gallery */}
      <div className="avatar-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-gallery-header">
          <h3 className="avatar-gallery-title">Vyberte si avatar</h3>
          <button onClick={onClose} className="avatar-close-btn">
            <X size={16} />
          </button>
        </div>
        <div className="avatar-grid">
          {Array.from({ length: TOTAL_AVATARS }, (_, i) => i + 1).map((id) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`avatar-grid-item ${activeId === id ? 'selected' : ''}`}
            >
              <img
                src={getAvatarSrc(id)}
                alt={`Avatar ${id}`}
                width={72}
                height={72}
                className="rounded-xl"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}

export default function AvatarPicker({ name, currentAvatarId, onSelect }: AvatarPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeId = currentAvatarId || nameToAvatarId(name);

  const handleSelect = (id: number) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="avatar-picker-trigger"
        title="Změnit avatar"
      >
        <img
          src={getAvatarSrc(activeId)}
          alt={name}
          width={80}
          height={80}
          className="rounded-2xl"
        />
        <span className="avatar-picker-edit">✏️</span>
      </button>

      {isOpen && (
        <AvatarGallery
          name={name}
          activeId={activeId}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
