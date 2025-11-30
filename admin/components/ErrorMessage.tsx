interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
  return (
    <div
      className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 text-red-800"
      role="alert"
    >
      <div className="flex justify-between items-start">
        <p className="font-medium">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800"
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
