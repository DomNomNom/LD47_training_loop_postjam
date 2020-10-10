import Random from "./random.js"
import {angle_normalize, clip} from './utils.js'

const {sin, cos, PI, min, max} = Math;
const TAU = 2 * Math.PI;

export class PendulumEnv {
    constructor(seed, {dt=.04}={}) {
        const rng = new Random(seed);

        this.max_speed = 8
        this.max_torque = 2.
        this.dt = dt
        this.g = 10
        this.m = 1
        this.l = 1
        this.last_torque = 0

        this.theta = PI * rng.uniform11();
        this.theta_dot = .5 * this.max_speed * rng.uniform11();
    }

    step(torque) {
        // this.theta_dot += action * dt;
        // this.theta += this.theta_dot * dt;
        // return 1;
        // dt = this.dt
        let {theta, theta_dot, g, m, l, dt} = this;

        torque = clip(torque, -this.max_torque, this.max_torque)
        this.last_torque = torque;
        let costs = angle_normalize(theta) ** 2 + .1 * theta_dot ** 2 + .001 * (torque ** 2)

        let newthdot = theta_dot + (-3 * g / (2 * l) * sin(theta + PI) + 3. / (m * l ** 2) * torque) * dt
        let newth = theta + newthdot * dt
        newthdot = clip(newthdot, -this.max_speed, this.max_speed)

        this.theta = angle_normalize(newth)
        this.theta_dot = newthdot
        return -costs
    }

    make_observation() {
        return {
            theta: this.theta,
            theta_dot: this.theta_dot,
            x: sin(this.theta),
            y: cos(this.theta),
        };
    }
}

