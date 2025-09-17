"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Topbar() {
	const pathname = usePathname();
	const isActive = (href: string) => pathname === href;

	return (
		<header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-black/30 bg-black/20 border-b border-white/10">
			<div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-4">
				<div className="flex items-center gap-2 shrink-0">
					<div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500" />
					<span className="text-white font-semibold hidden sm:block">EHR Pro</span>
				</div>

				<nav className="flex items-center gap-1">
					<Link href="/patients" className={`relative px-3 py-1.5 text-sm rounded-md ${isActive("/patients") ? "text-white" : "text-gray-200 hover:text-white hover:bg-white/10"}`}>
						Patients
						{isActive("/patients") && (
							<span className="absolute -bottom-[13px] left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
						)}
					</Link>
					<Link href="/appointments" className={`relative px-3 py-1.5 text-sm rounded-md ${isActive("/appointments") ? "text-white" : "text-gray-200 hover:text-white hover:bg-white/10"}`}>
						Appointments
						{isActive("/appointments") && (
							<span className="absolute -bottom-[13px] left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
						)}
					</Link>
					{/* <Link href="/clinical" className={`relative px-3 py-1.5 text-sm rounded-md ${isActive("/clinical") ? "text-white" : "text-gray-200 hover:text-white hover:bg-white/10"}`}>
						Clinical Operations
						{isActive("/clinical") && (
							<span className="absolute -bottom-[13px] left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
						)}
					</Link> */}
				</nav>

				<div className="ml-auto">
					<button className="h-8 w-8 rounded-full bg-white/10 border border-white/20" aria-label="User menu" />
				</div>
			</div>
		</header>
	);
}