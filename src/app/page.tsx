import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
	return (
		<main className={styles.main}>
			<h1>Stork Watch</h1>
			<Image
				className={styles.logo}
				src="/logo.svg"
				alt="Stork Watch Logo"
				width={180}
				height={180}
				priority
			/>
			<h2>Coming Soon</h2>
		</main>
	);
}
