import { getInitials, stringToColor } from "@/lib/colors";

interface ProfileCircleProps {
  name: string;
  className?: string;
}

export function ProfileCircle({ name, className = "" }: ProfileCircleProps) {
  const backgroundColor = stringToColor(name);
  const initials = getInitials(name);

  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white border-2 border-card ${className}`}
      style={{ backgroundColor }}
      title={name}
    >
      {initials}
    </div>
  );
}
