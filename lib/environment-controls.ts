export const environmentControls = {
  saturation: {label:'Color intensity', min:0, max:1.5, step:.01, value:.55},
  brightness: {label:'Brightness', min:.4, max:1.4, step:.01, value:.9},
  accents: {label:'Pink / purple', min:0, max:1.5, step:.01, value:.6},
  haze: {label:'Horizon haze', min:0, max:1, step:.01, value:.2},
  sun: {label:'Sun brightness', min:0, max:2, step:.01, value:1},
  elevation: {label:'Sun height', min:.01, max:.4, step:.005, value:.065},
  reflection: {label:'Reflections', min:0, max:1, step:.01, value:.8},
  ripples: {label:'Ripple strength', min:0, max:2, step:.01, value:1},
  speed: {label:'Water speed', min:0, max:2, step:.01, value:1},
};
export type EnvironmentSettings = Record<keyof typeof environmentControls, number>;
export const defaultEnvironment = Object.fromEntries(Object.entries(environmentControls).map(([key,control])=>[key,control.value])) as EnvironmentSettings;
