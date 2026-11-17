"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { PostDto } from "@/server/posts/service";

export default function PostGallery({ images, title }: { images: PostDto["images"]; title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const selected = images[active];

  function open(index: number) {
    setActive(index);
    dialog.current?.showModal();
  }

  if (!images.length) return null;
  return (
    <>
      <div className={`post-gallery post-collage post-collage-${Math.min(images.length, 5)}`}>
        {images.slice(0, 5).map((image, index) => (
          <button key={image.id} type="button" onClick={() => open(index)}
            aria-label={`Xem ảnh ${index + 1}: ${image.altText ?? title}`}
            className="post-collage-cell relative min-w-0 cursor-zoom-in overflow-hidden bg-[#eef2ed]">
            <Image src={image.url} alt={image.altText ?? title} fill
              sizes={images.length === 1 ? "(max-width: 900px) 100vw, 850px" : "(max-width: 640px) 100vw, 425px"}
              className="object-cover object-top" />
            {index === 4 && images.length > 5 && <span className="absolute inset-0 grid place-items-center bg-black/50 text-3xl font-bold text-white">+{images.length - 5}</span>}
          </button>
        ))}
      </div>
      <dialog ref={dialog} aria-label="Xem ảnh bài viết" className="post-image-dialog"
        onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setActive((index) => (index - 1 + images.length) % images.length);
          if (event.key === "ArrowRight") setActive((index) => (index + 1) % images.length);
        }}>
        <header className="image-viewer-header">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-xs text-white/60">Ảnh {active + 1} / {images.length}</p>
          </div>
          <button type="button" autoFocus onClick={() => dialog.current?.close()}
            aria-label="Đóng ảnh" className="image-viewer-control image-viewer-close">×</button>
        </header>
        <div className="image-viewer-stage">
          <div className="image-viewer-photo">
            <Image src={selected.url} alt={selected.altText ?? title} fill sizes="95vw" className="object-contain" />
          </div>
          {images.length > 1 && <>
            <button type="button" aria-label="Ảnh trước"
              onClick={() => setActive((index) => (index - 1 + images.length) % images.length)}
              className="image-viewer-control image-viewer-prev">‹</button>
            <button type="button" aria-label="Ảnh sau"
              onClick={() => setActive((index) => (index + 1) % images.length)}
              className="image-viewer-control image-viewer-next">›</button>
          </>}
        </div>
        {images.length > 1 && (
          <nav aria-label="Chọn ảnh" className="image-viewer-thumbnails">
            {images.map((image, index) => (
              <button key={image.id} type="button" aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)} className="image-viewer-thumbnail">
                <Image src={image.url} alt="" fill sizes="72px" className="object-cover" />
              </button>
            ))}
          </nav>
        )}
      </dialog>
    </>
  );
}
