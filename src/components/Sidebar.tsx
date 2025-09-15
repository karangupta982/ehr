import Link from "next/link";

const NavItem = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition">
    <span className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-fuchsia-500 opacity-80 group-hover:opacity-100" />
    <span className="text-sm text-gray-200 group-hover:text-white">{label}</span>
  </Link>
);

export default function Sidebar() {
  return (
    <aside className="hidden sm:block w-[240px] shrink-0 p-4 backdrop-blur supports-[backdrop-filter]:bg-black/20 bg-black/10 border-r border-white/10">
      <nav className="flex flex-col gap-1">
        <NavItem href="/" label="Dashboard" />
        <NavItem href="/patients" label="Patients" />
        <NavItem href="/appointments" label="Appointments" />
      </nav>
    </aside>
  );
}


