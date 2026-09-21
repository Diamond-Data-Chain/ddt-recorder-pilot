import "./globals.css";

export const metadata = {
  title: "DDT Recorder Pilot",
  description: "Diamond Data Chain DDT Recorder functional pilot"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
