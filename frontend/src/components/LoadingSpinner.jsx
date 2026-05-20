
export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-4">
      <div
        className="h-8 w-8 border-4 rounded-full animate-spin"
        style={{ borderColor: 'rgba(236,255,248,0.15)', borderTopColor: '#ECFFF8' }}
      />
    </div>
  );
}
