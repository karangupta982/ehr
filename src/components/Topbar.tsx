export default function Topbar() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/20 border-b border-white/10">
      <div className="mx-auto max-w-screen-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
          <span className="text-white font-semibold">EHR Integration Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-300">Sandbox</div>
          <div className="h-8 w-8 rounded-full bg-white/10 border border-white/20" />
        </div>
      </div>
    </header>
  );
}


