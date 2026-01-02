/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "@/components/sidebar";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn(),
}));

const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;

describe("Sidebar Component", () => {
	beforeEach(() => {
		mockUsePathname.mockReturnValue("/");
	});

	it("shows clusters link only for admin users", () => {
		const { rerender } = render(<Sidebar user={{ admin: false }} />);
		expect(screen.queryByText("Clusters")).not.toBeInTheDocument();

		rerender(<Sidebar user={{ admin: true }} />);
		expect(screen.getByText("Clusters")).toBeInTheDocument();
	});

	it("renders core navigation items", () => {
		render(<Sidebar user={{ admin: false }} />);

		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByText("Projects")).toBeInTheDocument();
		expect(screen.getByText("Pull Requests")).toBeInTheDocument();
	});
});
