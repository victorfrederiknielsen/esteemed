import { ProfileCircle } from "./ProfileCircle";

interface ProfileCircleStackProps {
  names: string[];
  maxVisible?: number;
}

export function ProfileCircleStack({
  names,
  maxVisible = 4,
}: ProfileCircleStackProps) {
  if (names.length === 0) return null;

  const visibleNames = names.slice(0, maxVisible);
  const overflowCount = names.length - maxVisible;
  const overflowNames = names.slice(maxVisible);

  return (
    <div className="flex items-center">
      {visibleNames.map((name, index) => (
        <div
          key={name}
          className="relative"
          style={{
            marginLeft: index === 0 ? 0 : -8,
            zIndex: index + 1,
          }}
        >
          <ProfileCircle name={name} />
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className="relative w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium bg-slate-200 text-slate-600 border-2 border-white"
          style={{ marginLeft: -8, zIndex: maxVisible + 1 }}
          title={overflowNames.join(", ")}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
