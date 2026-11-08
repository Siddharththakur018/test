import type { NextConfig } from 'next';
const config:NextConfig={
  async headers(){return [
    {source:'/mediapipe/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400'}]},
    {source:'/face-tracking.worker.js',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'}]},
    {source:'/photos/:path*',headers:[{key:'Cache-Control',value:'public, max-age=86400'}]},
  ];},
};
export default config;
