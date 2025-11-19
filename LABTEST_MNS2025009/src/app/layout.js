// src/app/layout.js
export const metadata = {
  title: "DH Frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}

