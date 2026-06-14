interface Props { message: string }

export default function ErrorMessage({ message }: Props) {
  if (!message) return null;
  return (
    <p className="text-red-700 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
      {message}
    </p>
  );
}
