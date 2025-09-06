import React from 'react';
import '../src/styles/globals.css'; // This is the new global CSS file you created

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;