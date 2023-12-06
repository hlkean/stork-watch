import type { Metadata } from "next";
import { Lilita_One } from "next/font/google";
import { ApolloProvider } from "@apollo/client";

import "./globals.css";
import { client } from "../utils";

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
			<ApolloProvider client={client}>
				<body className={inter.className}>{children}</body>
			</ApolloProvider>
		</html>
	);
}
