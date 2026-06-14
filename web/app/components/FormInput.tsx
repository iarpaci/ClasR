const INPUT_CLS = 'w-full bg-cream border border-cream-border rounded-sm px-4 py-3 text-[#1A1A1A] placeholder-[#B0A898] text-sm focus:outline-none focus:border-teal transition-colors';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export default function FormInput({ label, hint, ...props }: Props) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1.5">
        {label}
        {hint && <span className="text-muted opacity-60 ml-1">({hint})</span>}
      </label>
      <input {...props} className={INPUT_CLS} />
    </div>
  );
}
