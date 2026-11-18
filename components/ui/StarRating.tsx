"use client";

import { Rate } from "antd";
import { useState } from "react";

export function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span>Chưa đánh giá</span>;
  return <span role="img" aria-label={`${String(value).replace(".", ",")} trên 5 sao`}>
    <Rate allowHalf disabled value={value} style={{ color: "#d98242", fontSize: 20 }} />
  </span>;
}

export function StarRatingInput({ name, label, defaultValue, required = false, disabled = false }: {
  name: string; label: string; defaultValue?: number | null; required?: boolean; disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? (required ? 5 : 0));
  return <div className="mt-1.5 flex min-h-12 flex-wrap items-center gap-3">
    <Rate aria-label={label} allowHalf allowClear={!required} value={value} onChange={setValue}
      disabled={disabled} style={{ color: "#d98242" }} />
    <input type="hidden" name={name} value={value || ""} />
    {!required && value > 0 && <button type="button" disabled={disabled} onClick={() => setValue(0)}
      className="text-xs text-[#64766e] hover:underline disabled:opacity-50">Bỏ đánh giá</button>}
  </div>;
}
