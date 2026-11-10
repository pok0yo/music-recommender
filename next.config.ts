import type { NextConfig } from 'next';
if(process.env.VERCEL==='1'||process.env.APP_ENV==='production'){
  const value=process.env.NEXT_PUBLIC_API_URL||'';
  let valid=false;
  try{
    const url=new URL(value),host=url.hostname;
    valid=url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash
      &&(url.pathname==='/'||url.pathname==='')&&(!url.port||url.port==='443')
      &&host.includes('.')&&!/^\d+\.\d+\.\d+\.\d+$/.test(host)
      &&!/(?:localhost|\.local|\.test|\.invalid|example\.(?:com|org))$/.test(host);
  }catch{/* Invalid deployment values fail the build below. */}
  if(!valid)throw new Error('Production builds require NEXT_PUBLIC_API_URL to be the approved public HTTPS API origin.');
}
const config: NextConfig = { poweredByHeader: false, devIndicators: false };
export default config;
