import "./globals.css";
import type { Metadata } from "next";
import { Lilita_One } from "next/font/google";

// If loading a variable font, you don't need to specify the font weight
const inter = Lilita_One({ subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
	title: "Stork Watch",
	description: "Track the stork of your family and loved ones.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>{children}</body>
		</html>
	);
}
