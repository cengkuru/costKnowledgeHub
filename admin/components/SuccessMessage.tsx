interface SuccessMessageProps {
  message: string;
  onDismiss?: () => void;
}

export function SuccessMessage({ message, onDismiss }: SuccessMessageProps) {
  return (
    <div
      className="bg-green-50 border border-green-200 rounded-md p-4 mb-4 text-green-800"
      role="alert"
    >
      <div className="flex justify-between items-start">
        <p className="font-medium">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss success message"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
