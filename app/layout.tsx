import type {Metadata, Viewport} from 'next';
import './globals.css';
import FontLoader from '../components/font-loader';
export const metadata:Metadata={title:'LoveBooth — Miles Apart, Memories Together',description:'A little closer, wherever you are. A private virtual photobooth for two, with beautiful photo strips, birthday surprises, and memories to keep.',robots:{index:true,follow:true}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#fffaf6'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><FontLoader/>{children}</body></html>;}
