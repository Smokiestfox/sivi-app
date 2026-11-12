"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import StudentVerificationForm from "@/components/profile/StudentVerificationForm";
import { Toast } from "@/components/ui/Feedback";

type PostType = "roommate" | "review";

type PostFormProps = {
  type: PostType;
  onClose: () => void;
  onCreated: () => void;
};

const maxImageBytes = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function apiError(body: unknown): { message: string; fields?: Record<string, string> } | null {
  if (body === null || typeof body !== "object" || !("error" in body)) return null;
  const error = body.error;
  if (typeof error === "string") return { message: error };
  if (!error || typeof error !== "object") return null;
  const message = "message" in error && typeof error.message === "string" ? error.message : null;
  const fields = "fields" in error && error.fields && typeof error.fields === "object"
    ? error.fields as Record<string, string>
    : undefined;
  return message ? { message, fields } : null;
}

export default function PostForm({ type, onClose, onCreated }: PostFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    setError("");
    setFieldErrors({});
    const data = new FormData(form);
    const imageFiles = data.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
    if (imageFiles.length > 5) {
      setError("Mỗi bài chỉ được đính kèm tối đa 5 ảnh.");
      return;
    }
    const invalidImage = imageFiles.find((file) => !allowedImageTypes.has(file.type) || file.size > maxImageBytes);
    if (invalidImage) {
      setError("Ảnh phải là JPEG, PNG hoặc WebP và không vượt quá 5 MB.");
      return;
    }

    const number = (name: string) => Number(data.get(name));
    const common = {
      type,
      title: String(data.get("title") ?? ""),
      content: String(data.get("content") ?? ""),
      address: String(data.get("address") ?? ""),
      googleMapsUrl: String(data.get("googleMapsUrl") ?? "").trim() || null,
    };
    const payload = type === "roommate"
      ? {
          ...common,
          rent: number("rent"),
          peopleNeeded: number("peopleNeeded"),
          genderPreference: String(data.get("genderPreference")),
          areaM2: data.get("areaM2") ? number("areaM2") : null,
          roommateRequirements: String(data.get("roommateRequirements") ?? ""),
          roomType: String(data.get("roomType")),
          district: String(data.get("district") ?? ""),
          amenities: String(data.get("amenities") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
          contactInfo: String(data.get("contactInfo") ?? ""),
        }
      : {
          ...common,
          placeName: String(data.get("placeName") ?? ""),
          placeType: String(data.get("placeType")),
          referencePrice: data.get("referencePrice") ? number("referencePrice") : null,
          rating: number("rating"),
          experience: String(data.get("experience") ?? ""),
          priceRange: String(data.get("priceRange")),
          wifiRating: data.get("wifiRating") ? number("wifiRating") : null,
          atmosphereRating: data.get("atmosphereRating") ? number("atmosphereRating") : null,
          serviceRating: data.get("serviceRating") ? number("serviceRating") : null,
        };

    const request = new FormData();
    request.set("payload", JSON.stringify(payload));
    for (const file of imageFiles) request.append("images", file);

    setBusy(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        credentials: "same-origin",
        body: request,
      });
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const api = apiError(body);
        if (response.status === 401 || response.status === 403) {
          setShowVerification(true);
          setError(api?.message ?? "Bạn cần đăng nhập và xác thực sinh viên để đăng bài.");
        } else {
          setError(api?.message ?? "Không thể đăng bài. Vui lòng kiểm tra thông tin và thử lại.");
          setFieldErrors(api?.fields ?? {});
        }
        return;
      }
      onCreated();
      onClose();
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ. Dữ liệu trên form vẫn được giữ lại.");
    } finally {
      setBusy(false);
    }
  }

  const labelClass = "block text-sm font-semibold text-[#36564a]";
  const inputClass = "mt-1.5 w-full rounded-xl border border-[#dce4dd] bg-white px-3.5 py-3 text-sm text-[#18352d] outline-none focus:border-[#187b5b] disabled:opacity-60";

  function fieldError(name: string) {
    const key = `payload.${name}`;
    return fieldErrors[key] ? <p className="mt-1 text-xs text-red-700">{fieldErrors[key]}</p> : null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[#10271f]/55 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (!busy && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-[#fbfcfa] p-5 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#187b5b]">
              {type === "roommate" ? "Tìm bạn cùng nhà" : "Chia sẻ trải nghiệm"}
            </p>
            <h2 id={`${formId}-title`} className="mt-2 text-2xl font-bold text-[#18352d]">
              {type === "roommate" ? "Đăng tin tìm roommate" : "Viết review địa điểm"}
            </h2>
          </div>
          <button type="button" aria-label="Đóng form" disabled={busy} onClick={onClose} className="rounded-full px-3 py-1 text-xl text-[#64766e] hover:bg-[#eef2ed]">
            ×
          </button>
        </div>

        <form ref={formRef} onSubmit={submit} aria-busy={busy} className="mt-6 space-y-5">
          <div>
            <label htmlFor={`${formId}-title-field`} className={labelClass}>Tiêu đề *</label>
            <input id={`${formId}-title-field`} name="title" required maxLength={120} className={inputClass} disabled={busy} />
            {fieldError("title")}
          </div>
          <div>
            <label htmlFor={`${formId}-content`} className={labelClass}>{type === "roommate" ? "Mô tả *" : "Nội dung review *"}</label>
            <textarea id={`${formId}-content`} name="content" required minLength={1} maxLength={5000} rows={5} className={inputClass} disabled={busy} />
            {fieldError("content")}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${formId}-address`} className={labelClass}>{type === "roommate" ? "Khu vực / địa chỉ" : "Địa chỉ địa điểm"}</label>
              <input id={`${formId}-address`} name="address" maxLength={300} className={inputClass} disabled={busy} />
              {fieldError("address")}
            </div>
            <div>
              <label htmlFor={`${formId}-maps`} className={labelClass}>Link Google Maps (không bắt buộc)</label>
              <input id={`${formId}-maps`} name="googleMapsUrl" type="url" className={inputClass} disabled={busy} />
            </div>
          </div>

          {type === "roommate" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor={`${formId}-rent`} className={labelClass}>Giá thuê mỗi tháng (đ) *</label><input id={`${formId}-rent`} name="rent" type="number" min="0" max="2000000000" step="1000" required className={inputClass} disabled={busy} />{fieldError("rent")}</div>
                <div><label htmlFor={`${formId}-people`} className={labelClass}>Số người cần tìm *</label><input id={`${formId}-people`} name="peopleNeeded" type="number" min="1" max="20" required defaultValue="1" className={inputClass} disabled={busy} />{fieldError("peopleNeeded")}</div>
                <div><label htmlFor={`${formId}-district`} className={labelClass}>Quận / huyện</label><input id={`${formId}-district`} name="district" maxLength={100} className={inputClass} disabled={busy} />{fieldError("district")}</div>
                <div><label htmlFor={`${formId}-room-type`} className={labelClass}>Loại phòng *</label><select id={`${formId}-room-type`} name="roomType" required defaultValue="" className={inputClass} disabled={busy}><option value="" disabled>Chọn loại phòng</option><option value="shared">Ở ghép</option><option value="private">Phòng riêng</option><option value="studio">Studio</option></select>{fieldError("roomType")}</div>
                <div><label htmlFor={`${formId}-gender`} className={labelClass}>Ưu tiên giới tính</label><select id={`${formId}-gender`} name="genderPreference" defaultValue="any" className={inputClass} disabled={busy}><option value="any">Không yêu cầu</option><option value="male">Nam</option><option value="female">Nữ</option></select></div>
                <div><label htmlFor={`${formId}-area`} className={labelClass}>Diện tích (m², không bắt buộc)</label><input id={`${formId}-area`} name="areaM2" type="number" min="0.01" max="9999.99" step="0.01" className={inputClass} disabled={busy} /></div>
              </div>
              <div><label htmlFor={`${formId}-contact`} className={labelClass}>Thông tin liên hệ (Zalo / email / số điện thoại)</label><input id={`${formId}-contact`} name="contactInfo" maxLength={255} className={inputClass} disabled={busy} /><p className="mt-1 text-xs text-[#819188]">Thông tin này sẽ được AI kiểm duyệt cùng nội dung bài.</p></div>
              <div><label htmlFor={`${formId}-amenities`} className={labelClass}>Tiện ích (phân cách bằng dấu phẩy)</label><input id={`${formId}-amenities`} name="amenities" placeholder="Wifi, máy giặt, chỗ để xe" className={inputClass} disabled={busy} /></div>
              <div><label htmlFor={`${formId}-requirements`} className={labelClass}>Yêu cầu với roommate</label><textarea id={`${formId}-requirements`} name="roommateRequirements" rows={2} className={inputClass} disabled={busy} /></div>
            </>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor={`${formId}-place-name`} className={labelClass}>Tên địa điểm *</label><input id={`${formId}-place-name`} name="placeName" required maxLength={200} className={inputClass} disabled={busy} />{fieldError("placeName")}</div>
                <div><label htmlFor={`${formId}-place-type`} className={labelClass}>Loại địa điểm *</label><select id={`${formId}-place-type`} name="placeType" required defaultValue="" className={inputClass} disabled={busy}><option value="" disabled>Chọn loại địa điểm</option><option value="cafe">Cafe</option><option value="restaurant">Quán ăn</option><option value="street_food">Ăn vặt / đường phố</option><option value="photo">Photo</option><option value="other">Khác</option></select>{fieldError("placeType")}</div>
                <div><label htmlFor={`${formId}-rating`} className={labelClass}>Đánh giá tổng thể *</label><select id={`${formId}-rating`} name="rating" required defaultValue="5" className={inputClass} disabled={busy}><option value="5">5 sao</option><option value="4">4 sao</option><option value="3">3 sao</option><option value="2">2 sao</option><option value="1">1 sao</option></select></div>
                <div><label htmlFor={`${formId}-price-range`} className={labelClass}>Mức giá *</label><select id={`${formId}-price-range`} name="priceRange" required defaultValue="medium" className={inputClass} disabled={busy}><option value="low">Bình dân</option><option value="medium">Trung bình</option><option value="high">Cao</option></select></div>
                <div><label htmlFor={`${formId}-reference-price`} className={labelClass}>Giá tham khảo (đ)</label><input id={`${formId}-reference-price`} name="referencePrice" type="number" min="0" max="2000000000" step="1000" className={inputClass} disabled={busy} /></div>
                <div><label htmlFor={`${formId}-wifi`} className={labelClass}>Wifi (không bắt buộc)</label><select id={`${formId}-wifi`} name="wifiRating" defaultValue="" className={inputClass} disabled={busy}><option value="">Chưa đánh giá</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></div>
                <div><label htmlFor={`${formId}-atmosphere`} className={labelClass}>Không gian (không bắt buộc)</label><select id={`${formId}-atmosphere`} name="atmosphereRating" defaultValue="" className={inputClass} disabled={busy}><option value="">Chưa đánh giá</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></div>
                <div><label htmlFor={`${formId}-service`} className={labelClass}>Phục vụ (không bắt buộc)</label><select id={`${formId}-service`} name="serviceRating" defaultValue="" className={inputClass} disabled={busy}><option value="">Chưa đánh giá</option>{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}</select></div>
              </div>
              <div><label htmlFor={`${formId}-experience`} className={labelClass}>Trải nghiệm chi tiết (không bắt buộc)</label><textarea id={`${formId}-experience`} name="experience" rows={3} className={inputClass} disabled={busy} /></div>
            </>
          )}

          <div>
            <label htmlFor={`${formId}-images`} className={labelClass}>Ảnh đính kèm (tối đa 5 ảnh, mỗi ảnh 5 MB)</label>
            <input id={`${formId}-images`} name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className={`${inputClass} file:mr-3 file:rounded-full file:border-0 file:bg-[#e7f3ed] file:px-3 file:py-1 file:font-semibold file:text-[#187b5b]`} disabled={busy} />
          </div>

          {error && <Toast kind="error">{error}</Toast>}
          {showVerification && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f0f5f1] p-4">
              <p className="flex-1 text-sm text-[#36564a]">Cần tài khoản sinh viên đã xác thực để đăng bài.</p>
              <StudentVerificationForm initiallyOpen triggerLabel="Xác thực sinh viên" />
            </div>
          )}
          {busy && <Toast kind="moderating">AI đang kiểm duyệt nội dung...</Toast>}
          <div className="flex flex-col-reverse gap-3 border-t border-[#e5e9e2] pt-5 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={onClose} className="rounded-full border border-[#dce4dd] px-5 py-3 text-sm font-bold text-[#53685f] disabled:opacity-50">Hủy</button>
            <button type="submit" disabled={busy} className="rounded-full bg-[#187b5b] px-6 py-3 text-sm font-bold text-white hover:bg-[#126448] disabled:opacity-60">{busy ? "Đang kiểm duyệt..." : type === "roommate" ? "Đăng tin" : "Gửi review"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
