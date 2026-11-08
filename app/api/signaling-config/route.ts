import { signalingConfig } from '../../../lib/signaling-config';
export const dynamic='force-dynamic';
export function GET(){
  const config=signalingConfig({SIGNALING_SERVER_URL:process.env.SIGNALING_SERVER_URL,NEXT_PUBLIC_SIGNALING_URL:process.env.NEXT_PUBLIC_SIGNALING_URL,VERCEL:process.env.VERCEL,DATABASE_URL:process.env.DATABASE_URL});
  return Response.json(config,{status:'error' in config?503:200,headers:{'Cache-Control':'no-store'}});
}
