// pages/_app.js
import '../styles/global.css'; // ← global CSS import here
import { Toaster } from "react-hot-toast";

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="bottom-center" />
    </>
  );
}

export default MyApp;
