const names: Record<string, string> = {
  violence: "Bạo lực",
  sex: "Tình dục",
  ragebait: "Kích động tranh cãi",
  review: "Đánh giá",
  ask: "Hỏi đáp",
};

export default function ModerationScores({ labels }: { labels?: Record<string, number | string[]> }) {
  const tags = Array.isArray(labels?.tags) ? labels.tags : [];
  const entries = Object.entries(labels ?? {}).filter(([, score]) => typeof score === "number");
  if (!entries.length) return null;
  return (
    <dl className="mt-3 flex flex-wrap gap-2 text-sm">
      {entries.map(([tag, score]) => (
        <div key={tag} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${tags.includes(tag) ? "bg-amber-100 text-amber-900" : "bg-[#f1f4f0] text-[#36564a]"}`}>
          <dt>{names[tag] ?? tag}</dt>
          <dd className="font-semibold tabular-nums">{(Number(score) * 100).toFixed(1)}%</dd>
        </div>
      ))}
    </dl>
  );
}
