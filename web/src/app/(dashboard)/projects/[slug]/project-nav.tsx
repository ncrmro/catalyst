"use client";

import { ApplicationLayoutNav } from "@tetrastack/react-glass-components";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectNavProps {
	slug: string;
}

export function ProjectNav({ slug }: ProjectNavProps) {
	const pathname = usePathname();
	const basePath = `/projects/${slug}`;

	const options = [
		{ value: "features", label: "Features", href: basePath },
		{ value: "platform", label: "Platform", href: `${basePath}/platform` },
		{
			value: "conventions",
			label: "Conventions",
			href: `${basePath}/platform/conventions`,
		},
	];

	// Determine active value based on pathname
	let activeValue = "features";
	if (pathname.startsWith(`${basePath}/platform/conventions`)) {
		activeValue = "conventions";
	} else if (pathname.startsWith(`${basePath}/platform`)) {
		activeValue = "platform";
	}

	return (
		<ApplicationLayoutNav
			options={options}
			activeValue={activeValue}
			linkComponent={Link}
			ariaLabel="Project navigation"
		/>
	);
}
