import * as THREE from 'three';

// Layered F1 / smooth-F1 water adapted from Christian Ortiz (Cortiz), MIT; see THIRD_PARTY_NOTICES.md.
export function createWaterGeometry(software:boolean,narrow:boolean) {
  const segments=software?64:narrow?112:160;
  const geometry=new THREE.PlaneGeometry(2,2,segments,segments),positions=geometry.attributes.position;
  // Concentrate vertices around the player while retaining the original 2,000-unit horizon.
  const spread=(x:number)=>10*x+990*x**5;
  for(let i=0;i<positions.count;i++)positions.setXY(i,spread(positions.getX(i)),spread(positions.getY(i)));
  geometry.computeBoundingSphere();
  return geometry;
}

export const waterVertex=/* glsl */`
  uniform mat4 textureMatrix;
  uniform float uTime,ripples;
  varying vec4 vUv;
  varying vec3 vWorld,vWaterNormal;
  vec3 swell(vec2 p,float t){
    float a=dot(p,vec2(.94,.34))*.66-t*.58+sin(p.y*.2+t*.06)*.6;
    float b=dot(p,vec2(-.58,.81))*1.13-t*.41+cos(p.x*.17-t*.04)*.5;
    float c=dot(p,vec2(.29,.96))*1.97+t*.34;
    float h=sin(a)*.105+sin(b)*.042+sin(c)*.018;
    vec2 gradient=cos(a)*.105*(vec2(.94,.34)*.66+vec2(0.,cos(p.y*.2+t*.06)*.12))
      +cos(b)*.042*(vec2(-.58,.81)*1.13-vec2(sin(p.x*.17-t*.04)*.085,0.))
      +cos(c)*.018*vec2(.29,.96)*1.97;
    float r=length(p),q=clamp((r-3.2)/3.3,0.,1.),f=clamp((r-25.)/135.,0.,1.);
    float quiet=mix(.12,1.,q*q*(3.-2.*q)),far=1.-f*f*(3.-2.*f);
    vec2 fadeGradient=(.88*6.*q*(1.-q)/3.3*far-quiet*6.*f*(1.-f)/135.)*p/max(r,.001);
    return vec3(h*quiet*far,gradient*quiet*far+h*fadeGradient)*ripples;
  }
  void main(){
    vec2 p=(modelMatrix*vec4(position,1.)).xz;
    vec3 wave=swell(p,uTime),displaced=position+vec3(0.,0.,wave.x);
    vWorld=(modelMatrix*vec4(displaced,1.)).xyz;
    vWaterNormal=vec3(-wave.y,1.,-wave.z);
    vUv=textureMatrix*vec4(displaced,1.);
    gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);
  }`;

export function waterFragment(grading:string,software:boolean) {
  return /* glsl */`
    ${grading}
    #define WATER_FULL_DETAIL ${software?0:1}
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec3 uSun;
    varying vec4 vUv;
    varying vec3 vWorld,vWaterNormal;
    float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);
    }
    float softMin(float a,float b){float h=max(.55-abs(a-b),0.)/.55;return min(a,b)-h*h*h*.55/6.;}
    vec2 cells(vec2 p,float t){
      #if WATER_FULL_DETAIL == 1
        vec2 tile=floor(p),local=fract(p);float nearest=8.,smoothNearest=8.;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          vec2 neighbor=vec2(float(x),float(y)),seed=tile+neighbor;
          vec2 random=fract(sin(vec2(dot(seed,vec2(127.1,311.7)),dot(seed,vec2(269.5,183.3))))*43758.5453);
          vec2 point=.5+.38*sin(random*6.283185+vec2(t*.17,t*.21));
          float d=length(neighbor+point-local);nearest=min(nearest,d);smoothNearest=softMin(smoothNearest,d);
        }
        return vec2(nearest,nearest-smoothNearest);
      #else
        // CPU graphics retain displaced waves and reflections with cheaper, irregular contour highlights.
        float n=noise(p*.85+vec2(t*.04,-t*.03))*.7+noise(p*1.7+17.3)*.3;
        return vec2(n,(1.-smoothstep(.015,.11,abs(n-.5)))*.09);
      #endif
    }
    void main(){
      float t=uTime,distanceToCamera=distance(cameraPosition,vWorld);
      float detail=1.-smoothstep(20.,125.,distanceToCamera);
      vec2 p=vWorld.xz;
      vec3 normal=normalize(vWaterNormal),view=normalize(cameraPosition-vWorld);
      vec3 base=vec3(.045,.19,.37),ice=vec3(.52,.79,.95);
      float crest=0.;
      if(detail>.001){
        vec2 drift=vec2(noise(p*.13+vec2(t*.035,5.4)),noise(p*.13+vec2(9.7,-t*.028)))-.5;
        vec2 fine=vec2(sin(dot(p,vec2(1.9,.7))+drift.x*2.-t*.7),cos(dot(p,vec2(-.8,2.2))+drift.y*2.+t*.5));
        normal=normalize(normal+vec3(fine.x,0.,fine.y)*.045*ripples*detail);
        vec2 surface=p*.43+drift*1.5+vec2(-.035,.024)*t;
        vec2 top=cells(surface,t);
        vec2 below=(p-view.xz/max(view.y,.22)*.38-normal.xz*1.6)*.24+drift*.45+vec2(.013,-.019)*t;
        #if WATER_FULL_DETAIL == 1
          vec2 deep=cells(below+13.7,t*.48);
          float depthLight=smoothstep(.012,.08,deep.y);
        #else
          float depthLight=noise(below);
        #endif
        float footprint=max(length(dFdx(surface)),length(dFdy(surface)));
        float resolved=1.-smoothstep(.15,.6,footprint);
        float pool=noise(p*.11+drift*.4);
        base=mix(vec3(.025,.12,.29),vec3(.09,.32,.51),.3+pool*.7);
        base+=depthLight*vec3(.012,.03,.04)*detail*min(ripples,1.);
        base=mix(base,vec3(.23,.13,.39),pool*.28*accents);
        float broken=smoothstep(.3,.78,noise(p*.31+vec2(t*.025,4.1)));
        crest=smoothstep(.025,.085,top.y)*broken*resolved*detail*min(ripples,1.);
        ice=mix(ice,vec3(.73,.51,.82),noise(p*.15+2.8)*.35*accents);
        base=mix(base,ice,crest*.11);
      }
      float fresnel=pow(1.-max(dot(normal,view),0.),3.);
      float quiet=1.-smoothstep(3.2,6.5,length(p));
      vec4 uv=vUv;uv.xy+=normal.xz*.065*uv.w*detail;
      vec4 mirror=texture2DProj(tDiffuse,uv);
      float mirrorWeight=reflection*mix(mix(.52,.91,fresnel),.94,quiet);
      vec3 color=mix(base,mirror.rgb*vec3(1.015,1.,1.035),mirrorWeight*mirror.a);
      color+=ice*crest*.018*(1.-quiet*.75);
      vec3 halfVector=normalize(view+uSun);
      float glint=pow(max(dot(normal,halfVector),0.),155.);
      color+=glint*vec3(1.6,1.13,1.42)*sun*(.35+.65*fresnel);
      color*=1.-.1*exp(-dot(p*vec2(.32,.62),p*vec2(.32,.62)));
      color=mix(color,vec3(.65,.72,.83),smoothstep(35.,180.,distanceToCamera)*haze);
      gl_FragColor=vec4(grade(color),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
}
