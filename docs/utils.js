const {sin, cos, PI, min, max} = Math;
const TAU = 2 * Math.PI;

export function angle_normalize(x) {  // Returns x but within -pi .. pi
    x = x % TAU;
    if (x < 0) {
        x += TAU;
    }
    x = (x <= PI)? x : x - TAU
    return x;
}

export function clip(x, bot, top) {
    return max(min(x, top), bot);
}
export function sum(list) {
    return list.reduce((a,b) => a+b, 0);
}


export function range(length) {
    return new Array(length).fill(0).map((_,i) => i)
}
