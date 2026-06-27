import "./globals.css";

export const metadata = {
  title: "Black Rain Academy",
  description:
    "AI manga-learning MVP that turns textbook material into source-grounded comic study lessons."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
