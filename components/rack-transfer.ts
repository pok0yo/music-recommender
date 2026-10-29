import {Quaternion,Vector3,Euler} from 'three';

export const sleeveYaw=.9;
export const sleeveFront=3.3;
export const discRadius=1.65*1.25*.62;
export const sleeveRotation=new Quaternion().setFromEuler(new Euler(0,sleeveYaw,0));
export const seatedRotation=new Quaternion().setFromEuler(new Euler(-Math.PI/2,0,0));
export const floatRotation=new Quaternion().setFromEuler(new Euler(.12,.42,.12));
export type TransferFrame={seconds:number;position:Vector3;rotation:Quaternion;sleeveZ:number;sleeveYaw:number;rings:number;phase:string};

// Waypoints reserve the CD's full radius. No free spline or independent damping can cut a corner.
export function rackTransfer(position:Vector3,rotation:Quaternion,x:number,eject:boolean):TransferFrame[]{
  const frames:TransferFrame[]=[];
  const add=(seconds:number,p:Vector3,q:Quaternion,z:number,yaw:number,rings:number,phase:string)=>frames.push({seconds,position:p,rotation:q.clone(),sleeveZ:z,sleeveYaw:yaw,rings,phase});
  add(0,position.clone(),rotation,0,Math.PI/2,eject?0:1,'preparing');
  add(.6,new Vector3(position.x,3.8,position.z),rotation,0,Math.PI/2,0,'preparing');
  if(eject){add(.9,new Vector3(-.68,3.6,0),floatRotation,0,Math.PI/2,1,'browsing');return frames;}
  const outside=new Vector3(x,-.25,sleeveFront).add(new Vector3(-2.78,0,0).applyQuaternion(sleeveRotation));
  add(.55,new Vector3(outside.x,3.8,outside.z),sleeveRotation,sleeveFront,Math.PI/2,0,'preparing');
  add(.35,new Vector3(outside.x,3.8,outside.z),sleeveRotation,sleeveFront,sleeveYaw,0,'preparing');
  add(.65,outside.clone(),sleeveRotation,sleeveFront,sleeveYaw,0,'returning');
  add(.75,new Vector3(x,-.25,sleeveFront),sleeveRotation,sleeveFront,sleeveYaw,0,'returning');
  add(.15,new Vector3(x,-.25,sleeveFront),sleeveRotation,sleeveFront,sleeveYaw,0,'extracting');
  add(.8,outside.clone(),sleeveRotation,sleeveFront,sleeveYaw,0,'extracting');
  add(.75,new Vector3(outside.x,3.8,outside.z),sleeveRotation,sleeveFront,sleeveYaw,0,'lifting');
  add(.75,new Vector3(-.68,3.8,0),sleeveRotation,sleeveFront,Math.PI/2,0,'lifting');
  add(.5,new Vector3(-.68,3.8,0),seatedRotation,0,Math.PI/2,0,'seating');
  add(.65,new Vector3(-.68,1.865,0),seatedRotation,0,Math.PI/2,0,'seating');
  return frames;
}

export function sampleTransfer(frames:TransferFrame[],seconds:number,out:TransferFrame){
  let start=frames[0];
  for(let i=1;i<frames.length;i++){
    const end=frames[i];
    if(seconds<=end.seconds){
      const t=Math.max(0,seconds/end.seconds),s=t*t*t*(t*(t*6-15)+10);
      out.position.lerpVectors(start.position,end.position,s);out.rotation.slerpQuaternions(start.rotation,end.rotation,s);
      out.sleeveZ=start.sleeveZ+(end.sleeveZ-start.sleeveZ)*s;out.sleeveYaw=start.sleeveYaw+(end.sleeveYaw-start.sleeveYaw)*s;
      out.rings=start.rings+(end.rings-start.rings)*s;out.phase=end.phase;return false;
    }
    seconds-=end.seconds;start=end;
  }
  out.position.copy(start.position);out.rotation.copy(start.rotation);out.sleeveZ=start.sleeveZ;out.sleeveYaw=start.sleeveYaw;out.rings=start.rings;out.phase=start.phase;return true;
}
